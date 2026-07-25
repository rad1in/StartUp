const { randomUUID, randomBytes, createHash } = require('crypto');
const { pool } = require('../../lib/db');

function hashKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

async function listKeys(venueId) {
  const [rows] = await pool.query(
    'SELECT id, label, keyPrefix, createdAt, lastUsedAt, revokedAt FROM `ApiKey` WHERE venueId = ? ORDER BY createdAt DESC',
    [venueId]
  );
  return rows;
}

// Returns the plaintext key exactly once — the caller must show it to the
// user immediately, since only its hash is persisted from here on.
async function createKey(venueId, label) {
  const secret = randomBytes(24).toString('base64url');
  const key = `etcafe_live_${secret}`;
  const keyPrefix = key.slice(0, 16);
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `ApiKey` (id, venueId, label, keyPrefix, keyHash) VALUES (?, ?, ?, ?, ?)',
    [id, venueId, label?.trim() || 'کلید بدون‌نام', keyPrefix, hashKey(key)]
  );
  return { id, label, keyPrefix, key };
}

async function revokeKey(id, venueId) {
  await pool.query('UPDATE `ApiKey` SET revokedAt = NOW() WHERE id = ? AND venueId = ?', [id, venueId]);
}

async function verifyKey(key) {
  if (!key || !key.startsWith('etcafe_live_')) return null;
  const [[row]] = await pool.query(
    'SELECT * FROM `ApiKey` WHERE keyHash = ? AND revokedAt IS NULL',
    [hashKey(key)]
  );
  if (!row) return null;
  pool.query('UPDATE `ApiKey` SET lastUsedAt = NOW() WHERE id = ?', [row.id]).catch(() => {});
  return row;
}

module.exports = { listKeys, createKey, revokeKey, verifyKey };
