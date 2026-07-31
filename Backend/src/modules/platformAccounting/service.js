'use strict';
const { v4: uuid } = require('uuid');
const { pool } = require('../../lib/db');

const COMMISSION_SQL = `CASE v.subscriptionTier
  WHEN 'FREE'  THEN 0.10
  WHEN 'PRO'   THEN 0.07
  WHEN 'ULTRA' THEN 0.05
  ELSE 0.10 END`;

const COST_CATEGORIES = ['SERVER', 'PAYMENT_GATEWAY', 'SMS', 'STAFF', 'MARKETING', 'OTHER'];

async function getCommissionSummary({ from, to, groupBy = 'venue' }) {
  const f = from || new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);
  const t = to ? `${to} 23:59:59` : new Date().toISOString().slice(0, 19).replace('T', ' ');

  let selectExtra, groupClause;
  if (groupBy === 'tier') {
    selectExtra = `v.subscriptionTier AS label, v.subscriptionTier AS groupKey`;
    groupClause = `v.subscriptionTier`;
  } else if (groupBy === 'month') {
    selectExtra = `DATE_FORMAT(o.createdAt, '%Y-%m') AS label, DATE_FORMAT(o.createdAt, '%Y-%m') AS groupKey`;
    groupClause = `groupKey`;
  } else {
    selectExtra = `v.id AS groupKey, v.name AS label, v.subscriptionTier`;
    groupClause = `v.id`;
  }

  const [rows] = await pool.query(
    `SELECT
       ${selectExtra},
       COUNT(o.id)                                        AS orders,
       COALESCE(SUM(o.totalAmount), 0)                   AS gmv,
       COALESCE(SUM(o.totalAmount * ${COMMISSION_SQL}),0) AS commission,
       AVG(o.totalAmount * ${COMMISSION_SQL})             AS avgCommissionPerOrder
     FROM \`Order\` o
     JOIN \`Venue\` v ON o.venueId = v.id
     WHERE o.paymentStatus = 'SUCCESS' AND o.createdAt BETWEEN ? AND ?
     GROUP BY ${groupClause}
     ORDER BY commission DESC`,
    [f, t]
  );
  return rows;
}

async function getVenueContribution(venueId, from, to) {
  const f = from || new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);
  const t = to ? `${to} 23:59:59` : new Date().toISOString().slice(0, 19).replace('T', ' ');
  const [[summary]] = await pool.query(
    `SELECT
       v.id, v.name, v.subscriptionTier,
       COUNT(o.id)                                        AS orders,
       COALESCE(SUM(o.totalAmount), 0)                   AS gmv,
       COALESCE(SUM(o.totalAmount * ${COMMISSION_SQL}),0) AS commission
     FROM \`Venue\` v
     LEFT JOIN \`Order\` o ON o.venueId = v.id
       AND o.paymentStatus = 'SUCCESS' AND o.createdAt BETWEEN ? AND ?
     WHERE v.id = ?
     GROUP BY v.id`,
    [f, t, venueId]
  );
  return summary || null;
}

async function listPlatformCosts(year, month) {
  const [rows] = await pool.query(
    `SELECT pc.*, u.name AS createdByName
     FROM PlatformCost pc
     LEFT JOIN \`User\` u ON pc.createdBy = u.id
     WHERE pc.periodYear = ? AND pc.periodMonth = ?
     ORDER BY pc.createdAt DESC`,
    [year, month]
  );
  return rows;
}

async function addPlatformCost({ category, description, amount, periodYear, periodMonth, createdBy }) {
  if (!COST_CATEGORIES.includes(category)) throw new Error('دسته‌بندی نامعتبر است.');
  const id = uuid();
  await pool.query(
    `INSERT INTO PlatformCost (id, category, description, amount, periodYear, periodMonth, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, category, description, amount, periodYear, periodMonth, createdBy]
  );
  return { id };
}

async function updatePlatformCost(id, { category, description, amount }) {
  const fields = [];
  const params = [];
  if (category !== undefined) { fields.push('category = ?'); params.push(category); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (amount !== undefined) { fields.push('amount = ?'); params.push(amount); }
  if (!fields.length) return;
  params.push(id);
  await pool.query(`UPDATE PlatformCost SET ${fields.join(', ')} WHERE id = ?`, params);
}

async function deletePlatformCost(id) {
  await pool.query('DELETE FROM PlatformCost WHERE id = ?', [id]);
}

async function getPnL(year, month) {
  const monthStr = String(month).padStart(2, '0');
  const from = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${monthStr}-${lastDay} 23:59:59`;

  const [[revenue]] = await pool.query(
    `SELECT COALESCE(SUM(o.totalAmount * ${COMMISSION_SQL}), 0) AS commissionRevenue
     FROM \`Order\` o JOIN \`Venue\` v ON o.venueId = v.id
     WHERE o.paymentStatus = 'SUCCESS' AND o.createdAt BETWEEN ? AND ?`,
    [from, to]
  );

  const [costRows] = await pool.query(
    `SELECT category, SUM(amount) AS total
     FROM PlatformCost WHERE periodYear = ? AND periodMonth = ?
     GROUP BY category`,
    [year, month]
  );

  const totalCosts = costRows.reduce((sum, r) => sum + Number(r.total), 0);
  const costBreakdown = Object.fromEntries(costRows.map((r) => [r.category, Number(r.total)]));

  return {
    year: Number(year),
    month: Number(month),
    commissionRevenue: Number(revenue.commissionRevenue),
    totalCosts,
    netProfit: Number(revenue.commissionRevenue) - totalCosts,
    margin: revenue.commissionRevenue > 0
      ? ((Number(revenue.commissionRevenue) - totalCosts) / Number(revenue.commissionRevenue) * 100).toFixed(1)
      : '0',
    costBreakdown,
  };
}

async function getYearlyPnL(year) {
  const months = await Promise.all(
    Array.from({ length: 12 }, (_, i) => getPnL(year, i + 1))
  );
  const totalRevenue = months.reduce((s, m) => s + m.commissionRevenue, 0);
  const totalCosts = months.reduce((s, m) => s + m.totalCosts, 0);
  return {
    year: Number(year),
    months,
    totals: {
      commissionRevenue: totalRevenue,
      totalCosts,
      netProfit: totalRevenue - totalCosts,
    },
  };
}

module.exports = {
  getCommissionSummary,
  getVenueContribution,
  listPlatformCosts,
  addPlatformCost,
  updatePlatformCost,
  deletePlatformCost,
  getPnL,
  getYearlyPnL,
  COST_CATEGORIES,
};
