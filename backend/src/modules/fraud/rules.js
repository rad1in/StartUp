'use strict';
const { pool } = require('../../lib/db');
const { getSetting } = require('../../lib/platformSettings');

const DEFAULT_THRESHOLDS = {
  voidRatePercent: 15,
  voidRateMinOrders: 10,
  volumeSpikeMultiplier: 3,
  volumeSpikeMinAvgDaily: 2,
  failedPaymentMax: 5,
  couponRedemptionsMax: 2,
};

// Admin-tunable via /admin/fraud/thresholds — falls back to the defaults
// above so the engine works out of the box with no configuration.
async function getThresholds() {
  const saved = await getSetting('fraud.thresholds', {});
  return { ...DEFAULT_THRESHOLDS, ...saved };
}

async function detectHighVoidRate() {
  const t = await getThresholds();
  const [rows] = await pool.query(
    `SELECT
       v.id AS entityId, 'VENUE' AS entityType,
       v.name AS entityName,
       COUNT(o.id)                                                AS totalOrders,
       SUM(CASE WHEN o.status = 'VOIDED' THEN 1 ELSE 0 END)     AS voidedOrders,
       ROUND(
         SUM(CASE WHEN o.status = 'VOIDED' THEN 1 ELSE 0 END) * 100.0 / COUNT(o.id),
         1
       ) AS voidRate
     FROM \`Venue\` v
     JOIN \`Order\` o ON o.venueId = v.id
     WHERE o.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY v.id
     HAVING voidRate > ? AND totalOrders >= ?`,
    [t.voidRatePercent, t.voidRateMinOrders]
  );
  return rows.map((r) => ({
    entityType: r.entityType,
    entityId: r.entityId,
    ruleKey: 'HIGH_VOID_RATE',
    riskScore: Math.min(100, Math.round(r.voidRate * 2)),
    reason: `نرخ ابطال سفارش‌ها: ${r.voidRate}٪ (${r.voidedOrders} از ${r.totalOrders} سفارش در ۳۰ روز اخیر)`,
  }));
}

async function detectOrderVolumeSpike() {
  const t = await getThresholds();
  const [rows] = await pool.query(
    `SELECT
       v.id AS entityId, v.name AS entityName,
       today_cnt.cnt     AS todayOrders,
       ROUND(avg_cnt.avgPerDay, 1) AS avgDailyOrders
     FROM \`Venue\` v
     JOIN (
       SELECT venueId, COUNT(*) AS cnt
       FROM \`Order\`
       WHERE DATE(createdAt) = CURDATE()
       GROUP BY venueId
     ) today_cnt ON v.id = today_cnt.venueId
     JOIN (
       SELECT venueId, COUNT(*) / 30 AS avgPerDay
       FROM \`Order\`
       WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY venueId
     ) avg_cnt ON v.id = avg_cnt.venueId
     WHERE today_cnt.cnt > avg_cnt.avgPerDay * ?
       AND avg_cnt.avgPerDay >= ?`,
    [t.volumeSpikeMultiplier, t.volumeSpikeMinAvgDaily]
  );
  return rows.map((r) => ({
    entityType: 'VENUE',
    entityId: r.entityId,
    ruleKey: 'ORDER_VOLUME_SPIKE',
    riskScore: Math.min(100, Math.round((r.todayOrders / r.avgDailyOrders) * 20)),
    reason: `حجم سفارش‌های امروز (${r.todayOrders}) برابر ${(r.todayOrders / r.avgDailyOrders).toFixed(1)} برابر میانگین روزانه (${r.avgDailyOrders}) است.`,
  }));
}

async function detectFailedPaymentSurge() {
  const t = await getThresholds();
  const [rows] = await pool.query(
    `SELECT
       u.id AS entityId, u.name AS entityName, u.email,
       COUNT(p.id) AS failedAttempts
     FROM \`User\` u
     JOIN \`Payment\` p ON p.customerId = u.id
     WHERE p.status = 'FAILED'
       AND p.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     GROUP BY u.id
     HAVING failedAttempts > ?`,
    [t.failedPaymentMax]
  );
  return rows.map((r) => ({
    entityType: 'CUSTOMER',
    entityId: r.entityId,
    ruleKey: 'FAILED_PAYMENT_SURGE',
    riskScore: Math.min(100, r.failedAttempts * 8),
    reason: `${r.failedAttempts} تلاش پرداخت ناموفق در ۷ روز اخیر — کاربر: ${r.email}`,
  }));
}

async function detectCouponAbuse() {
  const t = await getThresholds();
  const [rows] = await pool.query(
    `SELECT
       u.id AS entityId, u.name AS entityName, u.email,
       COUNT(cr.id) AS redemptions
     FROM \`User\` u
     JOIN \`CouponRedemption\` cr ON cr.userId = u.id
     WHERE cr.redeemedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY u.id
     HAVING redemptions > ?`,
    [t.couponRedemptionsMax]
  );
  return rows.map((r) => ({
    entityType: 'CUSTOMER',
    entityId: r.entityId,
    ruleKey: 'COUPON_ABUSE',
    riskScore: Math.min(100, r.redemptions * 15),
    reason: `${r.redemptions} بار استفاده از کوپن در ۳۰ روز اخیر — کاربر: ${r.email}`,
  }));
}

async function detectDuplicateTrialAbuse() {
  const [rows] = await pool.query(
    `SELECT
       tf1.ownerId AS entityId,
       u.name      AS entityName,
       COUNT(DISTINCT tf2.ownerId) AS matchCount,
       GROUP_CONCAT(DISTINCT tf2.ownerId SEPARATOR ',') AS matchedOwners
     FROM TrialFingerprint tf1
     JOIN TrialFingerprint tf2 ON (
       (tf1.phone IS NOT NULL AND tf1.phone = tf2.phone)
       OR (tf1.businessId IS NOT NULL AND tf1.businessId = tf2.businessId)
     ) AND tf1.ownerId != tf2.ownerId
     JOIN \`User\` u ON tf1.ownerId = u.id
     GROUP BY tf1.ownerId`
  );
  return rows.map((r) => ({
    entityType: 'CUSTOMER',
    entityId: r.entityId,
    ruleKey: 'DUPLICATE_TRIAL_ABUSE',
    riskScore: Math.min(100, r.matchCount * 40 + 45),
    reason: `مشخصات هویتی با ${r.matchCount} حساب دیگر تطابق دارد — احتمال سوء استفاده از دوره آزمایشی.`,
  }));
}

module.exports = [
  detectHighVoidRate,
  detectOrderVolumeSpike,
  detectFailedPaymentSurge,
  detectCouponAbuse,
  detectDuplicateTrialAbuse,
];
module.exports.getThresholds = getThresholds;
module.exports.DEFAULT_THRESHOLDS = DEFAULT_THRESHOLDS;
