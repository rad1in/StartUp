const { randomUUID } = require('crypto');
const { pool } = require('./db');

async function logActivity(venueId, userId, action, entityType, entityId = null, details = null) {
  await pool.query(
    'INSERT INTO `ActivityLog` (id, venueId, userId, action, entityType, entityId, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [randomUUID(), venueId || null, userId || null, action, entityType, entityId, details ? JSON.stringify(details) : null]
  );
}

// venueId omitted/undefined = platform-wide (no venue filter); pass null explicitly
// to only match platform-level entries (venueId IS NULL).
async function listActivity({ venueId, entityType, action, userId, from, to, limit = 200 } = {}) {
  const conditions = [];
  const params = [];

  if (venueId !== undefined) {
    if (venueId === null) {
      conditions.push('a.venueId IS NULL');
    } else {
      conditions.push('a.venueId = ?');
      params.push(venueId);
    }
  }
  if (entityType) {
    conditions.push('a.entityType = ?');
    params.push(entityType);
  }
  if (action) {
    conditions.push('a.action = ?');
    params.push(action);
  }
  if (userId) {
    conditions.push('a.userId = ?');
    params.push(userId);
  }
  if (from) {
    conditions.push('a.createdAt >= ?');
    params.push(new Date(from));
  }
  if (to) {
    conditions.push('a.createdAt <= ?');
    params.push(new Date(to));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT a.*, u.name AS userName FROM \`ActivityLog\` a
     LEFT JOIN \`User\` u ON u.id = a.userId
     ${whereClause}
     ORDER BY a.createdAt DESC LIMIT ${Number(limit)}`,
    params
  );
  return rows;
}

module.exports = { logActivity, listActivity };
