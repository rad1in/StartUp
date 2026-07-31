const { pool } = require('./db');

async function findById(table, id) {
  const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function updateById(table, id, data, allowedFields) {
  const fields = Object.keys(data).filter((key) => allowedFields.includes(key) && data[key] !== undefined);
  if (fields.length === 0) return findById(table, id);

  const setClause = fields.map((field) => `\`${field}\` = ?`).join(', ');
  const values = fields.map((field) => data[field]);
  await pool.query(`UPDATE \`${table}\` SET ${setClause} WHERE id = ?`, [...values, id]);
  return findById(table, id);
}

async function deleteById(table, id) {
  await pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
}

module.exports = { findById, updateById, deleteById };
