const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../../lib/db');
const { sanitizeUser } = require('../auth/service');
const { logActivity } = require('../../lib/activityLog');
const { PERMISSION_KEYS, STAFF_DEFAULT_PERMISSIONS } = require('../../middleware/venuePermission');

async function listStaff(venueId) {
  const [rows] = await pool.query(
    "SELECT * FROM `User` WHERE venueId = ? AND role = 'VENUE_STAFF' ORDER BY createdAt DESC",
    [venueId]
  );
  const staff = rows.map(sanitizeUser);

  const [permissionRows] = await pool.query(
    `SELECT sp.* FROM \`StaffPermission\` sp
     JOIN \`User\` u ON u.id = sp.userId
     WHERE u.venueId = ? AND u.role = 'VENUE_STAFF'`,
    [venueId]
  );
  const permissionsByUser = new Map();
  for (const row of permissionRows) {
    if (!permissionsByUser.has(row.userId)) permissionsByUser.set(row.userId, []);
    if (row.granted) permissionsByUser.get(row.userId).push(row.permission);
  }

  return staff.map((member) => ({ ...member, permissions: permissionsByUser.get(member.id) || [] }));
}

async function createStaff(venueId, { email, password, name, phone, permissions }) {
  const [existing] = await pool.query('SELECT id FROM `User` WHERE email = ?', [email]);
  if (existing.length > 0) {
    const err = new Error('این ایمیل قبلاً ثبت‌نام کرده است.');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `User` (id, email, passwordHash, name, phone, role, venueId) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, email, passwordHash, name, phone || null, 'VENUE_STAFF', venueId]
  );

  const grantedPermissions =
    Array.isArray(permissions) && permissions.length > 0 ? permissions : STAFF_DEFAULT_PERMISSIONS;
  await setPermissions(id, grantedPermissions);

  const [rows] = await pool.query('SELECT * FROM `User` WHERE id = ?', [id]);
  return { ...sanitizeUser(rows[0]), permissions: grantedPermissions };
}

async function setPermissions(userId, grantedPermissions) {
  for (const permission of PERMISSION_KEYS) {
    const granted = grantedPermissions.includes(permission);
    await pool.query(
      `INSERT INTO \`StaffPermission\` (userId, permission, granted) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE granted = VALUES(granted)`,
      [userId, permission, granted]
    );
  }
}

async function updateStaffPermissions(venueId, userId, permissions, actingUserId) {
  const [rows] = await pool.query("SELECT * FROM `User` WHERE id = ? AND venueId = ? AND role = 'VENUE_STAFF'", [
    userId,
    venueId,
  ]);
  if (!rows[0]) {
    const err = new Error('کارمند مورد نظر یافت نشد.');
    err.status = 404;
    throw err;
  }

  await setPermissions(userId, Array.isArray(permissions) ? permissions : []);
  await logActivity(venueId, actingUserId, 'STAFF_PERMISSIONS_UPDATED', 'User', userId, { permissions });

  const [permissionRows] = await pool.query(
    'SELECT permission FROM `StaffPermission` WHERE userId = ? AND granted = TRUE',
    [userId]
  );
  return { ...sanitizeUser(rows[0]), permissions: permissionRows.map((r) => r.permission) };
}

async function removeStaff(venueId, userId, actingUserId) {
  const [rows] = await pool.query("SELECT * FROM `User` WHERE id = ? AND venueId = ? AND role = 'VENUE_STAFF'", [
    userId,
    venueId,
  ]);
  if (!rows[0]) {
    const err = new Error('کارمند مورد نظر یافت نشد.');
    err.status = 404;
    throw err;
  }

  await pool.query('UPDATE `User` SET venueId = NULL WHERE id = ?', [userId]);
  await pool.query('UPDATE `RefreshToken` SET revoked = TRUE WHERE userId = ?', [userId]);
  await logActivity(venueId, actingUserId, 'STAFF_REMOVED', 'User', userId, null);
}

async function getUserPermissions(userId) {
  const [rows] = await pool.query('SELECT permission FROM `StaffPermission` WHERE userId = ? AND granted = TRUE', [
    userId,
  ]);
  return rows.map((r) => r.permission);
}

module.exports = { listStaff, createStaff, updateStaffPermissions, removeStaff, getUserPermissions };
