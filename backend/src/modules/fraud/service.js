'use strict';
const { pool } = require('../../lib/db');
const { runDetection } = require('./engine');

async function listFlags({ status, entityType, page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];
  if (status) { conditions.push('f.status = ?'); params.push(status); }
  if (entityType) { conditions.push('f.entityType = ?'); params.push(entityType); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT
       f.*,
       reviewer.name AS reviewedByName,
       CASE f.entityType
         WHEN 'VENUE'    THEN v.name
         WHEN 'CUSTOMER' THEN u.name
         ELSE NULL
       END AS entityName
     FROM FraudFlag f
     LEFT JOIN \`User\` reviewer ON f.reviewedBy = reviewer.id
     LEFT JOIN \`Venue\` v ON f.entityType = 'VENUE' AND f.entityId = v.id
     LEFT JOIN \`User\` u ON f.entityType = 'CUSTOMER' AND f.entityId = u.id
     ${where}
     ORDER BY f.riskScore DESC, f.createdAt DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM FraudFlag f ${where}`,
    params
  );

  return { flags: rows, total, page, limit };
}

async function getFlag(id) {
  const [[flag]] = await pool.query(
    `SELECT f.*,
       reviewer.name AS reviewedByName,
       CASE f.entityType WHEN 'VENUE' THEN v.name WHEN 'CUSTOMER' THEN u.name END AS entityName
     FROM FraudFlag f
     LEFT JOIN \`User\` reviewer ON f.reviewedBy = reviewer.id
     LEFT JOIN \`Venue\` v ON f.entityType = 'VENUE' AND f.entityId = v.id
     LEFT JOIN \`User\` u ON f.entityType = 'CUSTOMER' AND f.entityId = u.id
     WHERE f.id = ?`,
    [id]
  );
  return flag || null;
}

async function reviewFlag(id, reviewedBy, { status, reviewNote }) {
  const allowed = ['REVIEWING', 'DISMISSED', 'ACTIONED'];
  if (!allowed.includes(status)) throw new Error('وضعیت نامعتبر است.');
  await pool.query(
    'UPDATE FraudFlag SET status = ?, reviewedBy = ?, reviewNote = ? WHERE id = ?',
    [status, reviewedBy, reviewNote || null, id]
  );
}

async function getSummary() {
  const [[row]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(status = 'OPEN') AS open,
       SUM(status = 'REVIEWING') AS reviewing,
       SUM(status = 'ACTIONED') AS actioned,
       SUM(riskScore >= 70) AS highRisk
     FROM FraudFlag`
  );
  return row;
}

module.exports = { listFlags, getFlag, reviewFlag, getSummary, runDetection };
