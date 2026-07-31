const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { emitToAdmins } = require('../../sockets');

async function notifyAdmins({ type, title, body, severity = 'INFO', link = null }) {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `AdminNotification` (id, type, title, body, severity, link) VALUES (?, ?, ?, ?, ?, ?)',
    [id, type, title, body || null, severity, link]
  );
  const notification = { id, type, title, body, severity, link, isRead: false, createdAt: new Date() };
  emitToAdmins('admin-notification:new', notification);
  return notification;
}

async function list({ limit = 30 } = {}) {
  const [rows] = await pool.query('SELECT * FROM `AdminNotification` ORDER BY createdAt DESC LIMIT ?', [limit]);
  return rows;
}

async function unreadCount() {
  const [[row]] = await pool.query('SELECT COUNT(*) AS c FROM `AdminNotification` WHERE isRead = FALSE');
  return row.c;
}

async function markRead(id) {
  await pool.query('UPDATE `AdminNotification` SET isRead = TRUE WHERE id = ?', [id]);
}

async function markAllRead() {
  await pool.query('UPDATE `AdminNotification` SET isRead = TRUE WHERE isRead = FALSE');
}

module.exports = { notifyAdmins, list, unreadCount, markRead, markAllRead };
