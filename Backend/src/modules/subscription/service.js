const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { getSetting, setSetting } = require('../../lib/platformSettings');
const { spendFromWallet } = require('../wallet/service');
const { rollDiscountPercent, HIGH_DISCOUNT_CAP } = require('./discountRoll');

const SUBSCRIPTION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_PRICE = 99000;
const DAY_MS = 24 * 60 * 60 * 1000;

async function getPlan() {
  const price = await getSetting('subscription.price', DEFAULT_PRICE);
  const enabled = await getSetting('subscription.enabled', true);
  return { price: Number(price), enabled: Boolean(enabled) };
}

async function updatePlan({ price, enabled }) {
  if (price !== undefined) await setSetting('subscription.price', Number(price));
  if (enabled !== undefined) await setSetting('subscription.enabled', Boolean(enabled));
  return getPlan();
}

async function getActiveSubscription(userId) {
  const [rows] = await pool.query(
    "SELECT * FROM `CustomerSubscription` WHERE userId = ? AND status = 'ACTIVE' ORDER BY createdAt DESC LIMIT 1",
    [userId]
  );
  const sub = rows[0];
  if (!sub) return null;
  if (new Date(sub.expiresAt) <= new Date()) {
    await pool.query("UPDATE `CustomerSubscription` SET status = 'EXPIRED' WHERE id = ?", [sub.id]);
    return null;
  }
  return sub;
}

function toPublicShape(sub) {
  if (!sub) return { active: false };
  return {
    active: true,
    startsAt: sub.startsAt,
    expiresAt: sub.expiresAt,
    highDiscountCount: sub.highDiscountCount,
    highDiscountCap: HIGH_DISCOUNT_CAP,
    daysLeft: Math.max(0, Math.ceil((new Date(sub.expiresAt) - new Date()) / DAY_MS)),
  };
}

async function getMySubscription(userId) {
  return toPublicShape(await getActiveSubscription(userId));
}

async function purchaseSubscription(userId) {
  const plan = await getPlan();
  if (!plan.enabled) {
    const err = new Error('اشتراک تخفیف در حال حاضر غیرفعال است.');
    err.status = 400;
    throw err;
  }
  const existing = await getActiveSubscription(userId);
  if (existing) {
    const err = new Error('شما هم‌اکنون اشتراک فعال دارید.');
    err.status = 409;
    throw err;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await spendFromWallet(connection, userId, plan.price, null, 'خرید اشتراک تخفیف ET-Cafe');

    const id = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SUBSCRIPTION_DURATION_MS);
    await connection.query(
      `INSERT INTO \`CustomerSubscription\` (id, userId, startsAt, expiresAt, status, pricePaid)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?)`,
      [id, userId, now, expiresAt, plan.price]
    );
    await connection.commit();
    return toPublicShape({ startsAt: now, expiresAt, highDiscountCount: 0 });
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// Called from inside orders/service.js's own transaction on the same
// connection. Returns the rolled discount percent, or null if the customer
// has no active subscription.
async function rollDiscountForOrder(connection, userId, orderId) {
  if (!userId) return null;
  const [[sub]] = await connection.query(
    "SELECT * FROM `CustomerSubscription` WHERE userId = ? AND status = 'ACTIVE' FOR UPDATE",
    [userId]
  );
  if (!sub) return null;
  if (new Date(sub.expiresAt) <= new Date()) {
    await connection.query("UPDATE `CustomerSubscription` SET status = 'EXPIRED' WHERE id = ?", [sub.id]);
    return null;
  }

  const { percent, isHigh } = rollDiscountPercent(sub.highDiscountCount);

  if (isHigh) {
    await connection.query(
      'UPDATE `CustomerSubscription` SET highDiscountCount = highDiscountCount + 1 WHERE id = ?',
      [sub.id]
    );
  }
  await connection.query(
    'INSERT INTO `SubscriptionDiscountLog` (id, subscriptionId, orderId, discountPercent) VALUES (?, ?, ?, ?)',
    [randomUUID(), sub.id, orderId, percent]
  );

  return percent;
}

async function adminListSubscriptions() {
  const [rows] = await pool.query(`
    SELECT cs.*, u.name AS userName, u.email AS userEmail
    FROM \`CustomerSubscription\` cs
    JOIN \`User\` u ON u.id = cs.userId
    ORDER BY cs.createdAt DESC
    LIMIT 200
  `);
  return rows;
}

async function adminStats() {
  const [[active]] = await pool.query(
    "SELECT COUNT(*) AS c FROM `CustomerSubscription` WHERE status = 'ACTIVE' AND expiresAt > NOW()"
  );
  const [[revenue]] = await pool.query('SELECT COALESCE(SUM(pricePaid), 0) AS total FROM `CustomerSubscription`');
  const [[totalCount]] = await pool.query('SELECT COUNT(*) AS c FROM `CustomerSubscription`');
  const [[discounts]] = await pool.query(
    'SELECT COUNT(*) AS c, COALESCE(AVG(discountPercent), 0) AS avgPercent FROM `SubscriptionDiscountLog`'
  );
  const [[highDiscounts]] = await pool.query('SELECT COALESCE(SUM(highDiscountCount), 0) AS c FROM `CustomerSubscription`');

  return {
    activeSubscribers: active.c,
    totalRevenue: Number(revenue.total),
    totalSubscriptionsSold: totalCount.c,
    totalDiscountsGiven: discounts.c,
    averageDiscountPercent: Math.round(Number(discounts.avgPercent) * 10) / 10,
    totalHighDiscountsGiven: Number(highDiscounts.c),
  };
}

module.exports = {
  getPlan,
  updatePlan,
  getMySubscription,
  purchaseSubscription,
  rollDiscountForOrder,
  adminListSubscriptions,
  adminStats,
};
