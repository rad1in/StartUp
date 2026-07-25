const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { pointsEarnedForOrder, pointsToToman } = require('../../utils/loyalty');
const { createNotification } = require('../notifications/service');

// Venues under the same VenueBrand pool loyalty points together (a chain's
// branches act like one cafe for rewards purposes). A venue with no brand
// only pools with itself. Platform-level adjustments (venueId IS NULL, e.g.
// admin goodwill credits) always count everywhere.
async function getBrandVenueIds(venueId) {
  const [rows] = await pool.query(
    `SELECT v2.id FROM \`Venue\` v1 JOIN \`Venue\` v2 ON v2.brandId = v1.brandId WHERE v1.id = ? AND v1.brandId IS NOT NULL`,
    [venueId]
  );
  return rows.length > 0 ? rows.map((r) => r.id) : [venueId];
}

async function computeScopedBalance(userId, venueId) {
  if (!venueId) {
    const [[{ total }]] = await pool.query(
      'SELECT COALESCE(SUM(points), 0) AS total FROM `LoyaltyTransaction` WHERE userId = ?',
      [userId]
    );
    return Number(total);
  }

  const venueIds = await getBrandVenueIds(venueId);
  const placeholders = venueIds.map(() => '?').join(',');
  const [[{ total }]] = await pool.query(
    `SELECT COALESCE(SUM(points), 0) AS total FROM \`LoyaltyTransaction\`
     WHERE userId = ? AND (venueId IS NULL OR venueId IN (${placeholders}))`,
    [userId, ...venueIds]
  );
  return Number(total);
}

async function getBalance(userId, venueId) {
  return { balance: await computeScopedBalance(userId, venueId) };
}

async function listTransactions(userId) {
  const [rows] = await pool.query(
    'SELECT * FROM `LoyaltyTransaction` WHERE userId = ? ORDER BY createdAt DESC LIMIT 200',
    [userId]
  );
  return rows;
}

// Called after a payment succeeds — awards points for the order (pool-based, not part of the order transaction).
async function earnPointsForOrder(order, venue) {
  if (!order.customerId) return;
  const points = pointsEarnedForOrder(venue, order.totalAmount);
  if (points <= 0) return;

  await pool.query(
    'INSERT INTO `LoyaltyTransaction` (id, userId, venueId, orderId, type, points, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [randomUUID(), order.customerId, order.venueId, order.id, 'EARN', points, 'امتیاز کسب‌شده از سفارش']
  );
  await pool.query('UPDATE `User` SET loyaltyPoints = loyaltyPoints + ? WHERE id = ?', [points, order.customerId]);

  await createNotification(order.customerId, 'LOYALTY', 'امتیاز جدید دریافت کردید', `${points} امتیاز به کیف پول وفاداری شما اضافه شد.`);
}

// Called inside the order-creation transaction — validates and deducts points, returns the discount in Toman.
async function redeemPointsInTransaction(connection, userId, points, venueId, orderId) {
  if (!points || points <= 0) return 0;

  // Row lock on User is only a per-user mutex here to serialize concurrent
  // redemptions — the actual balance is the brand-scoped ledger sum below,
  // not this row's (legacy, platform-wide) loyaltyPoints column.
  await connection.query('SELECT loyaltyPoints FROM `User` WHERE id = ? FOR UPDATE', [userId]);

  const venueIds = await getBrandVenueIds(venueId);
  const placeholders = venueIds.map(() => '?').join(',');
  const [[{ total }]] = await connection.query(
    `SELECT COALESCE(SUM(points), 0) AS total FROM \`LoyaltyTransaction\`
     WHERE userId = ? AND (venueId IS NULL OR venueId IN (${placeholders}))`,
    [userId, ...venueIds]
  );
  const balance = Number(total);
  if (balance < points) {
    const err = new Error('موجودی امتیاز کافی نیست.');
    err.status = 400;
    throw err;
  }

  await connection.query('UPDATE `User` SET loyaltyPoints = loyaltyPoints - ? WHERE id = ?', [points, userId]);
  await connection.query(
    'INSERT INTO `LoyaltyTransaction` (id, userId, venueId, orderId, type, points, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [randomUUID(), userId, venueId, orderId, 'REDEEM', -points, 'استفاده از امتیاز برای تخفیف سفارش']
  );

  return pointsToToman(points);
}

// Called when an order is voided/refunded after payment succeeded — reverses
// any points earned for it (best-effort; floors the balance at 0).
async function reverseEarnedPointsForOrder(orderId) {
  const [rows] = await pool.query(
    "SELECT * FROM `LoyaltyTransaction` WHERE orderId = ? AND type = 'EARN' LIMIT 1",
    [orderId]
  );
  const earnTx = rows[0];
  if (!earnTx) return;

  const [[user]] = await pool.query('SELECT loyaltyPoints FROM `User` WHERE id = ?', [earnTx.userId]);
  const pointsToRemove = Math.min(earnTx.points, user?.loyaltyPoints ?? 0);
  if (pointsToRemove <= 0) return;

  await pool.query('UPDATE `User` SET loyaltyPoints = loyaltyPoints - ? WHERE id = ?', [
    pointsToRemove,
    earnTx.userId,
  ]);
  await pool.query(
    'INSERT INTO `LoyaltyTransaction` (id, userId, venueId, orderId, type, points, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [randomUUID(), earnTx.userId, earnTx.venueId, orderId, 'ADJUST', -pointsToRemove, 'بازگشت امتیاز به دلیل لغو سفارش']
  );
}

module.exports = {
  getBalance,
  listTransactions,
  earnPointsForOrder,
  redeemPointsInTransaction,
  reverseEarnedPointsForOrder,
};
