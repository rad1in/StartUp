const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');

async function getSavedCart(userId, venueId) {
  const [rows] = await pool.query(
    'SELECT * FROM `SavedCart` WHERE userId = ? AND venueId = ?',
    [userId, venueId]
  );
  return rows[0] || null;
}

async function upsertSavedCart(userId, venueId, items) {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO \`SavedCart\` (id, userId, venueId, items) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE items = VALUES(items), updatedAt = NOW()`,
    [id, userId, venueId, JSON.stringify(items)]
  );
  return getSavedCart(userId, venueId);
}

async function clearSavedCart(userId, venueId) {
  await pool.query('DELETE FROM `SavedCart` WHERE userId = ? AND venueId = ?', [userId, venueId]);
}

module.exports = { getSavedCart, upsertSavedCart, clearSavedCart };
