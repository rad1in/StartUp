// Tunable knobs for the suggestion-scoring engine. Nothing in service.js
// should need to change to retune ranking — only these constants.

const TIME_OF_DAY_KEYWORDS = {
  morning: ['صبحانه', 'صبحگاهی'],
  afternoon: ['ناهار', 'غذای اصلی', 'فست فود'],
  evening: ['دسر', 'کافه', 'قهوه تخصصی', 'کیک'],
  night: ['روف‌تاپ', 'موسیقی زنده', 'شبانه'],
};

// Local hour ranges (venue-timezone-agnostic — good enough for a single-city MVP).
function currentPeriod(now = new Date()) {
  const hour = now.getHours();
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

const SCORE_WEIGHTS = {
  timeOfDay: 0.3,
  personalHistory: 0.4,
  proximity: 0.3,
};

// Personal-history sub-weights (favorites, recent views, tag overlap with past orders).
const PERSONAL_WEIGHTS = {
  favorited: 0.5,
  recentlyViewed: 0.2,
  tagOverlap: 0.3,
};

// Distance (meters) beyond which proximity contributes ~0.
const PROXIMITY_MAX_METERS = 5000;

module.exports = { TIME_OF_DAY_KEYWORDS, currentPeriod, SCORE_WEIGHTS, PERSONAL_WEIGHTS, PROXIMITY_MAX_METERS };
