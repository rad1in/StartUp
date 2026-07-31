'use strict';
const { pool } = require('../../lib/db');

// Dynamic rate joined from PlanConfig so BI always reflects current pricing configuration
const COMMISSION_SQL = `COALESCE((
  SELECT pc.commissionRate FROM PlanConfig pc WHERE pc.tier = v.subscriptionTier LIMIT 1
), 0.10)`;

function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

function dateDefaults(from, to) {
  const t = to || new Date().toISOString().slice(0, 10);
  const f = from || new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);
  return [f, `${t} 23:59:59`];
}

async function getFinancialOverview(from, to) {
  const [f, t] = dateDefaults(from, to);
  const [[row]] = await pool.query(
    `SELECT
       COUNT(o.id)                                        AS totalOrders,
       COALESCE(SUM(o.totalAmount), 0)                   AS gmv,
       COALESCE(SUM(o.totalAmount * ${COMMISSION_SQL}),0) AS commissionRevenue,
       COALESCE(AVG(o.totalAmount), 0)                   AS avgOrderValue,
       COUNT(DISTINCT o.venueId)                         AS activeVenues,
       COUNT(DISTINCT o.customerId)                      AS uniqueCustomers
     FROM \`Order\` o
     JOIN \`Venue\` v ON o.venueId = v.id
     WHERE o.paymentStatus = 'SUCCESS' AND o.createdAt BETWEEN ? AND ?`,
    [f, t]
  );
  return row;
}

async function getRevenueTrend(from, to, granularity = 'day') {
  const [f, t] = dateDefaults(from, to);
  const fmt = { day: '%Y-%m-%d', week: '%Y-%u', month: '%Y-%m', year: '%Y' }[granularity] || '%Y-%m-%d';
  const [rows] = await pool.query(
    `SELECT
       DATE_FORMAT(o.createdAt, ?) AS period,
       COUNT(o.id)                 AS orders,
       SUM(o.totalAmount)          AS gmv,
       SUM(o.totalAmount * ${COMMISSION_SQL}) AS commission
     FROM \`Order\` o
     JOIN \`Venue\` v ON o.venueId = v.id
     WHERE o.paymentStatus = 'SUCCESS' AND o.createdAt BETWEEN ? AND ?
     GROUP BY period ORDER BY period`,
    [fmt, f, t]
  );
  return rows;
}

async function getBreakdownByTier(from, to) {
  const [f, t] = dateDefaults(from, to);
  const [rows] = await pool.query(
    `SELECT
       v.subscriptionTier                                AS tier,
       COUNT(DISTINCT v.id)                              AS venueCount,
       COUNT(o.id)                                       AS orders,
       COALESCE(SUM(o.totalAmount), 0)                   AS gmv,
       COALESCE(SUM(o.totalAmount * ${COMMISSION_SQL}),0) AS commission
     FROM \`Order\` o
     JOIN \`Venue\` v ON o.venueId = v.id
     WHERE o.paymentStatus = 'SUCCESS' AND o.createdAt BETWEEN ? AND ?
     GROUP BY v.subscriptionTier`,
    [f, t]
  );
  return rows;
}

async function getBreakdownByVenue(from, to, limit = 20) {
  const [f, t] = dateDefaults(from, to);
  const [rows] = await pool.query(
    `SELECT
       v.id AS venueId, v.name AS venueName, v.city, v.subscriptionTier,
       COUNT(o.id) AS orders,
       COALESCE(SUM(o.totalAmount), 0) AS gmv,
       COALESCE(SUM(o.totalAmount * ${COMMISSION_SQL}), 0) AS commission
     FROM \`Order\` o
     JOIN \`Venue\` v ON o.venueId = v.id
     WHERE o.paymentStatus = 'SUCCESS' AND o.createdAt BETWEEN ? AND ?
     GROUP BY v.id ORDER BY gmv DESC LIMIT ?`,
    [f, t, Number(limit)]
  );
  return rows;
}

async function getBreakdownByCity(from, to) {
  const [f, t] = dateDefaults(from, to);
  const [rows] = await pool.query(
    `SELECT
       COALESCE(v.city, 'نامشخص') AS city,
       COUNT(DISTINCT v.id) AS venueCount,
       COUNT(o.id) AS orders,
       COALESCE(SUM(o.totalAmount), 0) AS gmv,
       COALESCE(SUM(o.totalAmount * ${COMMISSION_SQL}), 0) AS commission
     FROM \`Order\` o
     JOIN \`Venue\` v ON o.venueId = v.id
     WHERE o.paymentStatus = 'SUCCESS' AND o.createdAt BETWEEN ? AND ?
     GROUP BY v.city ORDER BY gmv DESC`,
    [f, t]
  );
  return rows;
}

async function getCustomerCohorts(from, to) {
  const [f, t] = dateDefaults(from, to);
  const [rows] = await pool.query(
    `SELECT
       DATE_FORMAT(first_order.firstOrderAt, '%Y-%m') AS cohortMonth,
       COUNT(DISTINCT first_order.customerId)         AS cohortSize,
       COUNT(DISTINCT repeat_orders.customerId)       AS repeatCustomers,
       ROUND(
         COUNT(DISTINCT repeat_orders.customerId) * 100.0
         / NULLIF(COUNT(DISTINCT first_order.customerId), 0), 1
       ) AS repeatRate
     FROM (
       SELECT customerId, MIN(createdAt) AS firstOrderAt
       FROM \`Order\`
       WHERE paymentStatus = 'SUCCESS' AND customerId IS NOT NULL
       GROUP BY customerId
     ) AS first_order
     LEFT JOIN (
       SELECT DISTINCT o2.customerId
       FROM \`Order\` o2
       JOIN (
         SELECT customerId, MIN(createdAt) AS firstOrderAt
         FROM \`Order\` WHERE paymentStatus = 'SUCCESS' AND customerId IS NOT NULL
         GROUP BY customerId
       ) AS fo ON o2.customerId = fo.customerId
       WHERE o2.paymentStatus = 'SUCCESS' AND o2.createdAt > fo.firstOrderAt
     ) AS repeat_orders ON first_order.customerId = repeat_orders.customerId
     WHERE first_order.firstOrderAt BETWEEN ? AND ?
     GROUP BY cohortMonth ORDER BY cohortMonth`,
    [f, t]
  );
  return rows;
}

async function getVenueActivity(from, to) {
  const [f, t] = dateDefaults(from, to);
  const [rows] = await pool.query(
    `SELECT
       v.id, v.name, v.city, v.subscriptionTier,
       COUNT(o.id)             AS orderCount,
       COALESCE(SUM(o.totalAmount), 0) AS revenue,
       MAX(o.createdAt)        AS lastOrderAt,
       CASE
         WHEN MAX(o.createdAt) IS NULL THEN 'NEVER_ACTIVE'
         WHEN MAX(o.createdAt) < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'CHURNED'
         ELSE 'ACTIVE'
       END AS activityStatus
     FROM \`Venue\` v
     LEFT JOIN \`Order\` o ON o.venueId = v.id
       AND o.paymentStatus = 'SUCCESS' AND o.createdAt BETWEEN ? AND ?
     GROUP BY v.id ORDER BY revenue DESC`,
    [f, t]
  );
  return rows;
}

async function getDrillDown(dimension, id, from, to, limit = 50) {
  const [f, t] = dateDefaults(from, to);
  let query, params;
  if (dimension === 'venue') {
    query = `SELECT o.id, o.totalAmount, o.status, o.paymentStatus, o.createdAt,
               u.name AS customerName
             FROM \`Order\` o LEFT JOIN \`User\` u ON o.customerId = u.id
             WHERE o.venueId = ? AND o.paymentStatus = 'SUCCESS' AND o.createdAt BETWEEN ? AND ?
             ORDER BY o.createdAt DESC LIMIT ?`;
    params = [id, f, t, Number(limit)];
  } else if (dimension === 'tier') {
    query = `SELECT o.id, o.totalAmount, o.createdAt, v.name AS venueName, v.subscriptionTier
             FROM \`Order\` o JOIN \`Venue\` v ON o.venueId = v.id
             WHERE v.subscriptionTier = ? AND o.paymentStatus = 'SUCCESS' AND o.createdAt BETWEEN ? AND ?
             ORDER BY o.createdAt DESC LIMIT ?`;
    params = [id, f, t, Number(limit)];
  } else if (dimension === 'city') {
    query = `SELECT o.id, o.totalAmount, o.createdAt, v.name AS venueName
             FROM \`Order\` o JOIN \`Venue\` v ON o.venueId = v.id
             WHERE v.city = ? AND o.paymentStatus = 'SUCCESS' AND o.createdAt BETWEEN ? AND ?
             ORDER BY o.createdAt DESC LIMIT ?`;
    params = [id, f, t, Number(limit)];
  } else {
    return [];
  }
  const [rows] = await pool.query(query, params);
  return rows;
}

// Conversion funnel derived from real order lifecycle data (no separate
// page-view tracking exists on this platform, so the funnel starts at "order
// created" rather than at site visits): created -> payment attempted ->
// payment succeeded -> served. Each stage's rate is relative to the previous
// stage, so a low number highlights exactly where orders are being lost.
async function getConversionFunnel(from, to, venueId) {
  const [f, t] = dateDefaults(from, to);
  const params = [f, t];
  let venueClause = '';
  if (venueId) {
    venueClause = ' AND o.venueId = ?';
    params.push(venueId);
  }
  const [[row]] = await pool.query(
    `SELECT
       COUNT(*) AS created,
       SUM(CASE WHEN o.paymentStatus IN ('SUCCESS', 'FAILED', 'REFUNDED') THEN 1 ELSE 0 END) AS paymentAttempted,
       SUM(CASE WHEN o.paymentStatus = 'SUCCESS' THEN 1 ELSE 0 END) AS paymentSucceeded,
       SUM(CASE WHEN o.status = 'SERVED' THEN 1 ELSE 0 END) AS served,
       SUM(CASE WHEN o.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled
     FROM \`Order\` o
     WHERE o.createdAt BETWEEN ? AND ?${venueClause}`,
    params
  );

  const stages = [
    { key: 'created', label: 'سفارش ثبت شد', count: Number(row.created) },
    { key: 'paymentAttempted', label: 'پرداخت انجام شد', count: Number(row.paymentAttempted) },
    { key: 'paymentSucceeded', label: 'پرداخت موفق بود', count: Number(row.paymentSucceeded) },
    { key: 'served', label: 'سفارش سرو شد', count: Number(row.served) },
  ];

  let prev = null;
  for (const stage of stages) {
    stage.dropOffRate = prev && prev.count > 0 ? Number((((prev.count - stage.count) / prev.count) * 100).toFixed(1)) : 0;
    stage.conversionFromStart = stages[0].count > 0 ? Number(((stage.count / stages[0].count) * 100).toFixed(1)) : 0;
    prev = stage;
  }

  return { stages, cancelled: Number(row.cancelled) };
}

async function getExportRows(type, from, to, extra = {}) {
  if (type === 'overview_trend') return getRevenueTrend(from, to, extra.granularity);
  if (type === 'by_venue') return getBreakdownByVenue(from, to, 1000);
  if (type === 'by_tier') return getBreakdownByTier(from, to);
  if (type === 'by_city') return getBreakdownByCity(from, to);
  if (type === 'venue_activity') return getVenueActivity(from, to);
  if (type === 'cohorts') return getCustomerCohorts(from, to);
  return [];
}

async function exportData(type, from, to, extra = {}) {
  return toCSV(await getExportRows(type, from, to, extra));
}

module.exports = {
  getFinancialOverview,
  getRevenueTrend,
  getBreakdownByTier,
  getBreakdownByVenue,
  getBreakdownByCity,
  getCustomerCohorts,
  getVenueActivity,
  getDrillDown,
  getConversionFunnel,
  exportData,
  getExportRows,
};
