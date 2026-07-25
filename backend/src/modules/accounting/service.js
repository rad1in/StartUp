const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { deleteById } = require('../../lib/sqlHelpers');

function startOfRange(period) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'weekly') {
    start.setDate(now.getDate() - 7);
  } else if (period === 'monthly') {
    start.setMonth(now.getMonth() - 1);
  } else {
    start.setHours(0, 0, 0, 0);
  }
  return start;
}

async function salesSummary(venueId, period = 'daily') {
  const since = startOfRange(period);
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS orderCount,
            COALESCE(SUM(totalAmount), 0) AS totalRevenue,
            COALESCE(SUM(commissionAmount), 0) AS totalCommission
     FROM \`Order\`
     WHERE venueId = ? AND paymentStatus = 'SUCCESS' AND createdAt >= ?`,
    [venueId, since]
  );

  const { orderCount, totalRevenue, totalCommission } = rows[0];

  return {
    period,
    since,
    orderCount: Number(orderCount),
    totalRevenue: Number(totalRevenue),
    totalCommission: Number(totalCommission),
    netRevenue: Number(totalRevenue) - Number(totalCommission),
  };
}

async function revenueByCategory(venueId) {
  const [rows] = await pool.query(
    `SELECT c.name AS category, COALESCE(SUM(oi.subtotal), 0) AS revenue
     FROM \`OrderItem\` oi
     JOIN \`Order\` o ON o.id = oi.orderId
     JOIN \`MenuItem\` mi ON mi.id = oi.menuItemId
     JOIN \`Category\` c ON c.id = mi.categoryId
     WHERE o.venueId = ? AND o.paymentStatus = 'SUCCESS'
     GROUP BY c.id, c.name`,
    [venueId]
  );
  return rows.map((row) => ({ category: row.category, revenue: Number(row.revenue) }));
}

async function revenueByItem(venueId) {
  const [rows] = await pool.query(
    `SELECT mi.name AS item, COALESCE(SUM(oi.quantity), 0) AS quantity, COALESCE(SUM(oi.subtotal), 0) AS revenue
     FROM \`OrderItem\` oi
     JOIN \`Order\` o ON o.id = oi.orderId
     JOIN \`MenuItem\` mi ON mi.id = oi.menuItemId
     WHERE o.venueId = ? AND o.paymentStatus = 'SUCCESS'
     GROUP BY mi.id, mi.name`,
    [venueId]
  );
  return rows.map((row) => ({ item: row.item, quantity: Number(row.quantity), revenue: Number(row.revenue) }));
}

async function listExpenses(venueId) {
  const [rows] = await pool.query('SELECT * FROM `Expense` WHERE venueId = ? ORDER BY date DESC', [venueId]);
  return rows;
}

async function createExpense(venueId, { category, amount, note, date }) {
  const id = randomUUID();
  await pool.query('INSERT INTO `Expense` (id, venueId, category, amount, note, date) VALUES (?, ?, ?, ?, ?, ?)', [
    id,
    venueId,
    category,
    amount,
    note || null,
    date ? new Date(date) : new Date(),
  ]);
  const [rows] = await pool.query('SELECT * FROM `Expense` WHERE id = ?', [id]);
  return rows[0];
}

async function deleteExpense(id) {
  return deleteById('Expense', id);
}

// --- Dashboard aggregates ---

async function todayStats(venueId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [[{ orderCount, totalRevenue }]] = await pool.query(
    `SELECT COUNT(*) AS orderCount, COALESCE(SUM(totalAmount), 0) AS totalRevenue
     FROM \`Order\` WHERE venueId = ? AND paymentStatus = 'SUCCESS' AND createdAt >= ?`,
    [venueId, start]
  );
  const [[{ activeCount }]] = await pool.query(
    "SELECT COUNT(*) AS activeCount FROM `Order` WHERE venueId = ? AND status NOT IN ('SERVED','CANCELLED')",
    [venueId]
  );

  const orders = Number(orderCount);
  const revenue = Number(totalRevenue);

  return {
    orderCount: orders,
    totalRevenue: revenue,
    activeCount: Number(activeCount),
    averageOrderValue: orders > 0 ? revenue / orders : 0,
  };
}

async function salesTrend(venueId, days = 7) {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const [rows] = await pool.query(
    `SELECT DATE(createdAt) AS day, COALESCE(SUM(totalAmount), 0) AS revenue, COUNT(*) AS orderCount
     FROM \`Order\` WHERE venueId = ? AND paymentStatus = 'SUCCESS' AND createdAt >= ?
     GROUP BY DATE(createdAt) ORDER BY day ASC`,
    [venueId, start]
  );
  return rows.map((row) => ({ day: row.day, revenue: Number(row.revenue), orderCount: Number(row.orderCount) }));
}

async function topSellingItems(venueId, limit = 5) {
  const items = await revenueByItem(venueId);
  return items.sort((a, b) => b.quantity - a.quantity).slice(0, limit);
}

async function peakHours(venueId) {
  const [rows] = await pool.query(
    `SELECT HOUR(createdAt) AS hour, COUNT(*) AS orderCount
     FROM \`Order\` WHERE venueId = ? AND paymentStatus = 'SUCCESS'
     GROUP BY HOUR(createdAt) ORDER BY hour ASC`,
    [venueId]
  );
  return rows.map((row) => ({ hour: Number(row.hour), orderCount: Number(row.orderCount) }));
}

async function dashboard(venueId) {
  const [today, trend7, trend30, topItems, peak] = await Promise.all([
    todayStats(venueId),
    salesTrend(venueId, 7),
    salesTrend(venueId, 30),
    topSellingItems(venueId),
    peakHours(venueId),
  ]);
  return { today, trend7, trend30, topItems, peakHours: peak };
}

// --- Payouts (venue read-only view) ---

async function listPayoutsForVenue(venueId) {
  const [rows] = await pool.query('SELECT * FROM `Payout` WHERE venueId = ? ORDER BY periodStart DESC', [venueId]);
  return rows;
}

module.exports = {
  salesSummary,
  revenueByCategory,
  revenueByItem,
  listExpenses,
  createExpense,
  deleteExpense,
  todayStats,
  salesTrend,
  topSellingItems,
  peakHours,
  dashboard,
  listPayoutsForVenue,
};
