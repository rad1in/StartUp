const { pool } = require('../../lib/db');

// A single 0-100 "how healthy is this venue" score, computed from three
// signals an ops team actually cares about: is order volume growing or
// shrinking month over month, is the venue rated well, and is it actively
// closed/suspended right now. No ML — just transparent, explainable weights
// so an admin can see exactly why a venue scored low.
async function computeHealthScores() {
  const [rows] = await pool.query(`
    SELECT
      v.id, v.name, v.status, v.isTemporarilyClosed,
      COALESCE(rev.avgRating, 0) AS averageRating,
      COALESCE(cur.cnt, 0) AS ordersThisMonth,
      COALESCE(prev.cnt, 0) AS ordersLastMonth
    FROM \`Venue\` v
    LEFT JOIN (
      SELECT venueId, COUNT(*) AS cnt FROM \`Order\`
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND paymentStatus = 'SUCCESS'
      GROUP BY venueId
    ) cur ON cur.venueId = v.id
    LEFT JOIN (
      SELECT venueId, COUNT(*) AS cnt FROM \`Order\`
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND createdAt < DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND paymentStatus = 'SUCCESS'
      GROUP BY venueId
    ) prev ON prev.venueId = v.id
    LEFT JOIN (
      SELECT venueId, AVG(rating) AS avgRating FROM \`Review\` GROUP BY venueId
    ) rev ON rev.venueId = v.id
    WHERE v.status != 'REJECTED'
  `);

  return rows.map((v) => {
    const orderGrowth =
      v.ordersLastMonth === 0
        ? (v.ordersThisMonth > 0 ? 1 : 0.5) // no history — neutral-ish, credit for any activity
        : Math.max(0, Math.min(1, v.ordersThisMonth / v.ordersLastMonth));
    const ratingScore = Math.max(0, Math.min(1, Number(v.averageRating) / 5));
    const activePenalty = v.status === 'SUSPENDED' ? 0 : v.isTemporarilyClosed ? 0.5 : 1;

    // Weighted: order momentum matters most, then rating, then being open at all.
    const score = Math.round((orderGrowth * 0.5 + ratingScore * 0.3 + activePenalty * 0.2) * 100);

    let risk = 'LOW';
    if (score < 40) risk = 'HIGH';
    else if (score < 65) risk = 'MEDIUM';

    return {
      venueId: v.id,
      name: v.name,
      score,
      risk,
      ordersThisMonth: v.ordersThisMonth,
      ordersLastMonth: v.ordersLastMonth,
      averageRating: Number(v.averageRating),
      isTemporarilyClosed: !!v.isTemporarilyClosed,
    };
  });
}

async function getHealthForVenue(venueId) {
  const all = await computeHealthScores();
  return all.find((v) => v.venueId === venueId) || null;
}

module.exports = { computeHealthScores, getHealthForVenue };
