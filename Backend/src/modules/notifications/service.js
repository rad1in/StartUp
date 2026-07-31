const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { emitToCustomer } = require('../../sockets');
const { sendPushToUser } = require('../push/service');

const CATEGORIES = ['ORDER_STATUS', 'PROMO', 'LOYALTY', 'SYSTEM', 'NEW_ORDER', 'LOW_REVIEW'];

async function isEnabled(userId, category) {
  const [rows] = await pool.query(
    'SELECT enabled FROM `NotificationPreference` WHERE userId = ? AND category = ?',
    [userId, category]
  );
  if (rows.length === 0) return true; // default on if no row yet
  return !!rows[0].enabled;
}

async function createNotification(userId, type, title, body, data = null) {
  if (!userId) return null;
  const enabled = await isEnabled(userId, type);
  if (!enabled) return null;

  const id = randomUUID();
  await pool.query(
    'INSERT INTO `Notification` (id, userId, type, title, body, data) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, type, title, body, data ? JSON.stringify(data) : null]
  );

  const [rows] = await pool.query('SELECT * FROM `Notification` WHERE id = ?', [id]);
  const notification = rows[0];
  emitToCustomer(userId, 'notification:new', notification);

  // Web Push reaches the user even when the app/tab is closed — the in-app
  // notification above (row + socket event) is the source of truth; push is
  // strictly a best-effort bonus channel, so failures here never surface.
  // `url` lets the mobile app deep-link straight to the relevant screen when
  // the user taps the push (e.g. the order that just changed status).
  const url = data?.orderId ? `/order/${data.orderId}` : '/';
  sendPushToUser(userId, { title, body, tag: type, url, data: { ...(data || {}), url } }).catch(() => {});

  return notification;
}

async function listNotifications(userId) {
  const [rows] = await pool.query(
    'SELECT * FROM `Notification` WHERE userId = ? ORDER BY isRead ASC, createdAt DESC LIMIT 100',
    [userId]
  );
  return rows;
}

async function markAsRead(userId, id) {
  await pool.query('UPDATE `Notification` SET isRead = TRUE WHERE id = ? AND userId = ?', [id, userId]);
}

async function markAllAsRead(userId) {
  await pool.query('UPDATE `Notification` SET isRead = TRUE WHERE userId = ?', [userId]);
}

async function getPreferences(userId) {
  const [rows] = await pool.query('SELECT category, enabled FROM `NotificationPreference` WHERE userId = ?', [
    userId,
  ]);
  const byCategory = new Map(rows.map((r) => [r.category, !!r.enabled]));
  return CATEGORIES.map((category) => ({ category, enabled: byCategory.get(category) ?? true }));
}

async function setPreference(userId, category, enabled) {
  await pool.query(
    `INSERT INTO \`NotificationPreference\` (userId, category, enabled) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
    [userId, category, enabled]
  );
}

module.exports = {
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
  getPreferences,
  setPreference,
  CATEGORIES,
};
