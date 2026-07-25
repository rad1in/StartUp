const { pool } = require('../../lib/db');
const { distanceMeters } = require('../../utils/geo');
const {
  TIME_OF_DAY_KEYWORDS,
  currentPeriod,
  SCORE_WEIGHTS,
  PERSONAL_WEIGHTS,
  PROXIMITY_MAX_METERS,
} = require('./weights');

// --- Individual scorers — each one is independent and safe to tune/replace
// on its own without touching the others or the combining logic below. ---

function timeOfDayScore(venue, now = new Date()) {
  const keywords = TIME_OF_DAY_KEYWORDS[currentPeriod(now)] || [];
  if (keywords.length === 0 || !(venue.tags || []).length) return 0;
  const matches = venue.tags.filter((tag) => keywords.includes(tag)).length;
  return Math.min(matches / keywords.length, 1);
}

function proximityScore(position, venue) {
  if (!position || !venue.lat || !venue.lng) return 0;
  const dist = distanceMeters(position, venue);
  return Math.max(0, 1 - dist / PROXIMITY_MAX_METERS);
}

// Personal history is 0 for guests (no customerId) — this is the graceful
// degrade for that weight; time-of-day + proximity still apply.
async function personalHistoryScores(customerId, venues) {
  if (!customerId || venues.length === 0) {
    return new Map(venues.map((v) => [v.id, 0]));
  }

  const [favoriteRows] = await pool.query('SELECT venueId FROM `FavoriteVenue` WHERE userId = ?', [customerId]);
  const favoritedIds = new Set(favoriteRows.map((r) => r.venueId));

  const [recentRows] = await pool.query('SELECT venueId FROM `RecentlyViewedVenue` WHERE userId = ?', [customerId]);
  const recentlyViewedIds = new Set(recentRows.map((r) => r.venueId));

  const [orderRows] = await pool.query(
    `SELECT DISTINCT v.tags FROM \`Order\` o JOIN \`Venue\` v ON v.id = o.venueId WHERE o.customerId = ?`,
    [customerId]
  );
  const pastOrderedTags = new Set();
  for (const row of orderRows) {
    const tags = row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : [];
    tags.forEach((t) => pastOrderedTags.add(t));
  }

  const scores = new Map();
  for (const venue of venues) {
    const favorited = favoritedIds.has(venue.id) ? 1 : 0;
    const recentlyViewed = recentlyViewedIds.has(venue.id) ? 1 : 0;
    const venueTags = venue.tags || [];
    const overlap =
      venueTags.length > 0 && pastOrderedTags.size > 0
        ? venueTags.filter((t) => pastOrderedTags.has(t)).length / venueTags.length
        : 0;

    scores.set(
      venue.id,
      favorited * PERSONAL_WEIGHTS.favorited +
        recentlyViewed * PERSONAL_WEIGHTS.recentlyViewed +
        overlap * PERSONAL_WEIGHTS.tagOverlap
    );
  }
  return scores;
}

// Combines the three sub-scores per venue. Wrapped so one bad row can't blank
// the whole list — falls back to a neutral 0 contribution for that venue.
async function scoreVenues(venues, { customerId, position } = {}) {
  const personalScores = await personalHistoryScores(customerId, venues).catch(() => new Map());

  return venues
    .map((venue) => {
      let total = 0;
      try {
        const time = timeOfDayScore(venue) * SCORE_WEIGHTS.timeOfDay;
        const personal = (personalScores.get(venue.id) || 0) * SCORE_WEIGHTS.personalHistory;
        const proximity = proximityScore(position, venue) * SCORE_WEIGHTS.proximity;
        total = time + personal + proximity;
      } catch (err) {
        total = 0;
      }
      return { ...venue, suggestionScore: total };
    })
    .sort((a, b) => b.suggestionScore - a.suggestionScore);
}

module.exports = { timeOfDayScore, proximityScore, personalHistoryScores, scoreVenues };
