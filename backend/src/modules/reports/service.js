const { pool } = require('../../lib/db');

const FRAUD_REFUND_RATE_THRESHOLD = 0.2; // 20% of a venue's payments refunded
const FRAUD_CANCEL_RATE_THRESHOLD = 0.3; // 30% of a venue's orders cancelled
const FRAUD_WINDOW_DAYS = 30;

async function revenueByVenue() {
  const [rows] = await pool.query(
    `SELECT v.id AS venueId, v.name AS venueName, COALESCE(SUM(o.totalAmount), 0) AS revenue,
            COALESCE(SUM(o.commissionAmount), 0) AS commission
     FROM \`Venue\` v
     LEFT JOIN \`Order\` o ON o.venueId = v.id AND o.paymentStatus = 'SUCCESS'
     GROUP BY v.id, v.name
     ORDER BY revenue DESC`
  );
  return rows.map((r) => ({ ...r, revenue: Number(r.revenue), commission: Number(r.commission) }));
}

async function revenueByRegion() {
  const [rows] = await pool.query(
    `SELECT COALESCE(v.city, 'نامشخص') AS city, COALESCE(SUM(o.totalAmount), 0) AS revenue
     FROM \`Venue\` v
     LEFT JOIN \`Order\` o ON o.venueId = v.id AND o.paymentStatus = 'SUCCESS'
     GROUP BY city
     ORDER BY revenue DESC`
  );
  return rows.map((r) => ({ city: r.city, revenue: Number(r.revenue) }));
}

async function commissionByTier() {
  const [rows] = await pool.query(
    `SELECT v.subscriptionTier AS tier, COALESCE(SUM(o.commissionAmount), 0) AS commission, COUNT(o.id) AS orderCount
     FROM \`Venue\` v
     LEFT JOIN \`Order\` o ON o.venueId = v.id AND o.paymentStatus = 'SUCCESS'
     GROUP BY v.subscriptionTier`
  );
  return rows.map((r) => ({ tier: r.tier, commission: Number(r.commission), orderCount: Number(r.orderCount) }));
}

async function topVenues(limit = 10) {
  const rows = await revenueByVenue();
  return rows.slice(0, limit);
}

async function retention() {
  const [[{ totalCustomers }]] = await pool.query("SELECT COUNT(*) AS totalCustomers FROM `User` WHERE role = 'CUSTOMER'");
  const [[{ repeatCustomers }]] = await pool.query(
    `SELECT COUNT(*) AS repeatCustomers FROM (
       SELECT customerId FROM \`Order\` WHERE customerId IS NOT NULL AND paymentStatus = 'SUCCESS'
       GROUP BY customerId HAVING COUNT(*) > 1
     ) AS repeats`
  );
  const total = Number(totalCustomers) || 0;
  const repeat = Number(repeatCustomers) || 0;
  return { totalCustomers: total, repeatCustomers: repeat, retentionRate: total > 0 ? repeat / total : 0 };
}

async function fraudFlags() {
  const since = new Date();
  since.setDate(since.getDate() - FRAUD_WINDOW_DAYS);

  const [venues] = await pool.query(
    `SELECT v.id, v.name,
            COUNT(o.id) AS totalOrders,
            SUM(CASE WHEN o.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelledOrders,
            SUM(CASE WHEN o.paymentStatus = 'REFUNDED' THEN 1 ELSE 0 END) AS refundedOrders
     FROM \`Venue\` v
     JOIN \`Order\` o ON o.venueId = v.id AND o.createdAt >= ?
     GROUP BY v.id, v.name
     HAVING totalOrders >= 5`,
    [since]
  );

  return venues
    .map((v) => {
      const total = Number(v.totalOrders);
      const cancelRate = total > 0 ? Number(v.cancelledOrders) / total : 0;
      const refundRate = total > 0 ? Number(v.refundedOrders) / total : 0;
      const flags = [];
      if (cancelRate > FRAUD_CANCEL_RATE_THRESHOLD) flags.push('نرخ لغو سفارش بالا');
      if (refundRate > FRAUD_REFUND_RATE_THRESHOLD) flags.push('نرخ استرداد بالا');
      return { venueId: v.id, venueName: v.name, totalOrders: total, cancelRate, refundRate, flags };
    })
    .filter((v) => v.flags.length > 0);
}

async function reconciliation() {
  const [rows] = await pool.query(
    `SELECT v.id AS venueId, v.name AS venueName,
            COALESCE(SUM(o.totalAmount), 0) AS gmv,
            COALESCE(SUM(o.commissionAmount), 0) AS commission,
            COALESCE((SELECT SUM(p.amount) FROM \`Payout\` p WHERE p.venueId = v.id AND p.status = 'PAID'), 0) AS paidOut
     FROM \`Venue\` v
     LEFT JOIN \`Order\` o ON o.venueId = v.id AND o.paymentStatus = 'SUCCESS'
     GROUP BY v.id, v.name`
  );
  return rows.map((r) => ({
    venueId: r.venueId,
    venueName: r.venueName,
    gmv: Number(r.gmv),
    commission: Number(r.commission),
    paidOut: Number(r.paidOut),
    netOwed: Number(r.gmv) - Number(r.commission) - Number(r.paidOut),
  }));
}

async function refundOverview() {
  const [rows] = await pool.query(
    `SELECT p.id, p.orderId, p.amount, p.status, p.createdAt, v.name AS venueName
     FROM \`Payment\` p
     JOIN \`Order\` o ON o.id = p.orderId
     JOIN \`Venue\` v ON v.id = o.venueId
     WHERE p.status = 'REFUNDED'
     ORDER BY p.createdAt DESC`
  );
  return rows;
}

module.exports = {
  revenueByVenue,
  revenueByRegion,
  commissionByTier,
  topVenues,
  retention,
  fraudFlags,
  reconciliation,
  refundOverview,
};
