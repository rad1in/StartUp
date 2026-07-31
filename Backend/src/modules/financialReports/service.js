const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { createNotification } = require('../notifications/service');

async function getSchedule(venueId) {
  const [rows] = await pool.query('SELECT * FROM `FinancialReportSchedule` WHERE venueId = ?', [venueId]);
  return rows[0] || { venueId, frequency: 'WEEKLY', isActive: false, lastGeneratedAt: null };
}

async function updateSchedule(venueId, { frequency, isActive }) {
  await pool.query(
    `INSERT INTO \`FinancialReportSchedule\` (venueId, frequency, isActive)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE frequency = VALUES(frequency), isActive = VALUES(isActive)`,
    [venueId, frequency || 'WEEKLY', isActive ? 1 : 0]
  );
  return getSchedule(venueId);
}

async function listReports(venueId) {
  const [rows] = await pool.query(
    'SELECT id, venueId, periodStart, periodEnd, frequency, summaryJson, createdAt FROM `FinancialReport` WHERE venueId = ? ORDER BY createdAt DESC LIMIT 50',
    [venueId]
  );
  return rows.map((r) => ({ ...r, summary: typeof r.summaryJson === 'string' ? JSON.parse(r.summaryJson) : r.summaryJson, summaryJson: undefined }));
}

async function computePeriodSummary(venueId, periodStart, periodEnd) {
  const [[totals]] = await pool.query(
    `SELECT COUNT(*) AS orderCount,
            COALESCE(SUM(totalAmount), 0) AS totalRevenue,
            COALESCE(SUM(commissionAmount), 0) AS totalCommission,
            COALESCE(SUM(discountAmount), 0) AS totalDiscount
     FROM \`Order\`
     WHERE venueId = ? AND paymentStatus = 'SUCCESS' AND createdAt >= ? AND createdAt < ?`,
    [venueId, periodStart, periodEnd]
  );
  const [byCategory] = await pool.query(
    `SELECT c.name AS category, COALESCE(SUM(oi.subtotal), 0) AS revenue
     FROM \`OrderItem\` oi
     JOIN \`Order\` o ON o.id = oi.orderId
     JOIN \`MenuItem\` mi ON mi.id = oi.menuItemId
     JOIN \`Category\` c ON c.id = mi.categoryId
     WHERE o.venueId = ? AND o.paymentStatus = 'SUCCESS' AND o.createdAt >= ? AND o.createdAt < ?
     GROUP BY c.id, c.name
     ORDER BY revenue DESC`,
    [venueId, periodStart, periodEnd]
  );
  const [topItems] = await pool.query(
    `SELECT mi.name AS item, COALESCE(SUM(oi.quantity), 0) AS quantity, COALESCE(SUM(oi.subtotal), 0) AS revenue
     FROM \`OrderItem\` oi
     JOIN \`Order\` o ON o.id = oi.orderId
     JOIN \`MenuItem\` mi ON mi.id = oi.menuItemId
     WHERE o.venueId = ? AND o.paymentStatus = 'SUCCESS' AND o.createdAt >= ? AND o.createdAt < ?
     GROUP BY mi.id, mi.name
     ORDER BY revenue DESC
     LIMIT 10`,
    [venueId, periodStart, periodEnd]
  );

  return {
    orderCount: Number(totals.orderCount),
    totalRevenue: Number(totals.totalRevenue),
    totalCommission: Number(totals.totalCommission),
    totalDiscount: Number(totals.totalDiscount),
    netRevenue: Number(totals.totalRevenue) - Number(totals.totalCommission),
    byCategory: byCategory.map((r) => ({ category: r.category, revenue: Number(r.revenue) })),
    topItems: topItems.map((r) => ({ item: r.item, quantity: Number(r.quantity), revenue: Number(r.revenue) })),
  };
}

async function generateReport(venueId, periodStart, periodEnd, frequency) {
  const summary = await computePeriodSummary(venueId, periodStart, periodEnd);
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `FinancialReport` (id, venueId, periodStart, periodEnd, frequency, summaryJson) VALUES (?, ?, ?, ?, ?, ?)',
    [id, venueId, periodStart, periodEnd, frequency, JSON.stringify(summary)]
  );

  const [[venue]] = await pool.query('SELECT ownerId FROM `Venue` WHERE id = ?', [venueId]);
  if (venue?.ownerId) {
    await createNotification(
      venue.ownerId,
      'SYSTEM',
      'گزارش مالی دوره‌ای آماده شد',
      `درآمد خالص این دوره: ${summary.netRevenue.toLocaleString('fa-IR')} تومان از ${summary.orderCount.toLocaleString('fa-IR')} سفارش.`,
      { reportId: id }
    );
  }
  return { id, venueId, periodStart, periodEnd, frequency, summary };
}

// Polled from server.js (matches the scheduled-broadcast poller pattern).
async function processDueReports() {
  const [schedules] = await pool.query('SELECT * FROM `FinancialReportSchedule` WHERE isActive = 1');
  const now = new Date();
  for (const sched of schedules) {
    const intervalMs = sched.frequency === 'MONTHLY' ? 30 * 24 * 3600 * 1000 : 7 * 24 * 3600 * 1000;
    const last = sched.lastGeneratedAt ? new Date(sched.lastGeneratedAt) : null;
    if (last && now.getTime() - last.getTime() < intervalMs) continue;

    const periodStart = last || new Date(now.getTime() - intervalMs);
    try {
      await generateReport(sched.venueId, periodStart, now, sched.frequency);
      await pool.query('UPDATE `FinancialReportSchedule` SET lastGeneratedAt = ? WHERE venueId = ?', [now, sched.venueId]);
    } catch {
      // Skip this venue this cycle; retried on the next poll.
    }
  }
}

module.exports = { getSchedule, updateSchedule, listReports, generateReport, processDueReports };
