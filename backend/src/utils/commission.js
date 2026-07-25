const { pool } = require('../lib/db');

// Hardcoded fallback only — used if a tier's row is somehow missing from
// PlanConfig (fresh install before the plans seed runs, or manual DB tinkering).
const COMMISSION_RATE_BY_TIER = {
  FREE: 5.0,
  PRO: 2.0,
  ULTRA: 1.0,
};

// PlanConfig is the single source of truth for commission rates (edited via
// the admin "مدیریت پلن‌ها" page). It stores a fraction (0.05 = 5%), while
// Venue.commissionRate and every commission calculation in orders/service.js
// expect a whole percent (5 = 5%), so we convert here at the one boundary.
async function commissionRateForTier(tier) {
  const [[row]] = await pool.query('SELECT commissionRate FROM `PlanConfig` WHERE tier = ?', [tier]);
  if (row) return Number(row.commissionRate) * 100;
  return COMMISSION_RATE_BY_TIER[tier] ?? COMMISSION_RATE_BY_TIER.FREE;
}

module.exports = { COMMISSION_RATE_BY_TIER, commissionRateForTier };
