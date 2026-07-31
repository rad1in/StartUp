const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { PERMISSION_KEYS } = require('../../middleware/platformPermission');

function parseRole(row) {
  return { ...row, permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions };
}

async function listRoles() {
  const [rows] = await pool.query('SELECT * FROM `CustomRole` ORDER BY name ASC');
  return rows.map(parseRole);
}

async function createRole({ name, permissions }) {
  const valid = (permissions || []).filter((p) => PERMISSION_KEYS.includes(p));
  const id = randomUUID();
  await pool.query('INSERT INTO `CustomRole` (id, name, permissions) VALUES (?, ?, ?)', [
    id,
    name.trim(),
    JSON.stringify(valid),
  ]);
  const [[row]] = await pool.query('SELECT * FROM `CustomRole` WHERE id = ?', [id]);
  return parseRole(row);
}

async function updateRole(id, { name, permissions }) {
  const fields = [];
  const params = [];
  if (name !== undefined) {
    fields.push('name = ?');
    params.push(name.trim());
  }
  if (permissions !== undefined) {
    fields.push('permissions = ?');
    params.push(JSON.stringify(permissions.filter((p) => PERMISSION_KEYS.includes(p))));
  }
  if (fields.length === 0) return listRoles();
  params.push(id);
  await pool.query(`UPDATE \`CustomRole\` SET ${fields.join(', ')} WHERE id = ?`, params);
  const [[row]] = await pool.query('SELECT * FROM `CustomRole` WHERE id = ?', [id]);
  return parseRole(row);
}

async function deleteRole(id) {
  await pool.query('DELETE FROM `CustomRole` WHERE id = ?', [id]);
}

// Applies a role's permission set to a staff member: grants every permission
// in the role and revokes every other permission not in it — a clean "set to
// exactly this role" operation rather than an additive merge.
async function applyRoleToStaff(roleId, userId) {
  const [[role]] = await pool.query('SELECT * FROM `CustomRole` WHERE id = ?', [roleId]);
  if (!role) {
    const err = new Error('نقش یافت نشد.');
    err.status = 404;
    throw err;
  }
  const permissions = JSON.parse(role.permissions);
  for (const key of PERMISSION_KEYS) {
    const granted = permissions.includes(key);
    await pool.query(
      `INSERT INTO \`AdminPermission\` (userId, permission, granted) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE granted = VALUES(granted)`,
      [userId, key, granted]
    );
  }
  return { applied: true, permissions };
}

module.exports = { listRoles, createRole, updateRole, deleteRole, applyRoleToStaff };
