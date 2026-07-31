const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../../lib/db');
const { sanitizeUser } = require('../auth/service');
const { logActivity } = require('../../lib/activityLog');
const { PERMISSION_KEYS, ROLE_DEFAULT_PERMISSIONS } = require('../../middleware/platformPermission');

const ADMIN_TEAM_ROLES = ['SUPER_ADMIN', 'SUPPORT_STAFF', 'FINANCE_STAFF'];

async function listAdminStaff() {
  const placeholders = ADMIN_TEAM_ROLES.map(() => '?').join(', ');
  const [rows] = await pool.query(`SELECT * FROM \`User\` WHERE role IN (${placeholders}) ORDER BY createdAt DESC`, ADMIN_TEAM_ROLES);
  const staff = rows.map(sanitizeUser);

  const userIds = staff.map((s) => s.id);
  if (userIds.length === 0) return [];
  const idPlaceholders = userIds.map(() => '?').join(', ');
  const [permissionRows] = await pool.query(
    `SELECT * FROM \`AdminPermission\` WHERE userId IN (${idPlaceholders})`,
    userIds
  );
  const permissionsByUser = new Map();
  for (const row of permissionRows) {
    if (!permissionsByUser.has(row.userId)) permissionsByUser.set(row.userId, []);
    if (row.granted) permissionsByUser.get(row.userId).push(row.permission);
  }

  return staff.map((member) => ({ ...member, permissions: permissionsByUser.get(member.id) || [] }));
}

async function setPermissions(userId, grantedPermissions) {
  for (const permission of PERMISSION_KEYS) {
    const granted = grantedPermissions.includes(permission);
    await pool.query(
      `INSERT INTO \`AdminPermission\` (userId, permission, granted) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE granted = VALUES(granted)`,
      [userId, permission, granted]
    );
  }
}

async function createAdminStaff({ email, password, name, phone, role, permissions }) {
  if (!['SUPPORT_STAFF', 'FINANCE_STAFF', 'SUPER_ADMIN'].includes(role)) {
    const err = new Error('نقش انتخاب‌شده معتبر نیست.');
    err.status = 400;
    throw err;
  }

  const [existing] = await pool.query('SELECT id FROM `User` WHERE email = ?', [email]);
  if (existing.length > 0) {
    const err = new Error('این ایمیل قبلاً ثبت‌نام کرده است.');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = randomUUID();
  await pool.query('INSERT INTO `User` (id, email, passwordHash, name, phone, role) VALUES (?, ?, ?, ?, ?, ?)', [
    id,
    email,
    passwordHash,
    name,
    phone || null,
    role,
  ]);

  const grantedPermissions =
    Array.isArray(permissions) && permissions.length > 0 ? permissions : ROLE_DEFAULT_PERMISSIONS[role] || [];
  await setPermissions(id, grantedPermissions);

  const [rows] = await pool.query('SELECT * FROM `User` WHERE id = ?', [id]);
  return { ...sanitizeUser(rows[0]), permissions: grantedPermissions };
}

async function updateAdminPermissions(userId, permissions, actingUserId) {
  const placeholders = ADMIN_TEAM_ROLES.map(() => '?').join(', ');
  const [rows] = await pool.query(`SELECT * FROM \`User\` WHERE id = ? AND role IN (${placeholders})`, [
    userId,
    ...ADMIN_TEAM_ROLES,
  ]);
  if (!rows[0]) {
    const err = new Error('کاربر مورد نظر یافت نشد.');
    err.status = 404;
    throw err;
  }

  await setPermissions(userId, Array.isArray(permissions) ? permissions : []);
  await logActivity(null, actingUserId, 'ADMIN_PERMISSIONS_UPDATED', 'User', userId, { permissions });

  const [permissionRows] = await pool.query(
    'SELECT permission FROM `AdminPermission` WHERE userId = ? AND granted = TRUE',
    [userId]
  );
  return { ...sanitizeUser(rows[0]), permissions: permissionRows.map((r) => r.permission) };
}

async function removeAdminStaff(userId, actingUserId) {
  const [rows] = await pool.query("SELECT * FROM `User` WHERE id = ? AND role != 'SUPER_ADMIN'", [userId]);
  if (!rows[0]) {
    const err = new Error('این کاربر یافت نشد یا قابل حذف نیست.');
    err.status = 404;
    throw err;
  }

  await pool.query('UPDATE `User` SET role = ? WHERE id = ?', ['CUSTOMER', userId]);
  await pool.query('UPDATE `RefreshToken` SET revoked = TRUE WHERE userId = ?', [userId]);
  await logActivity(null, actingUserId, 'ADMIN_STAFF_REMOVED', 'User', userId, null);
}

async function getUserPermissions(userId) {
  const [rows] = await pool.query('SELECT permission FROM `AdminPermission` WHERE userId = ? AND granted = TRUE', [
    userId,
  ]);
  return rows.map((r) => r.permission);
}

module.exports = { listAdminStaff, createAdminStaff, updateAdminPermissions, removeAdminStaff, getUserPermissions };
