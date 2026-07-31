const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, updateById } = require('../../lib/sqlHelpers');

async function listRules(venueId) {
  const [rows] = await pool.query('SELECT * FROM `HappyHourRule` WHERE venueId = ? ORDER BY startTime ASC', [venueId]);
  return rows;
}

function validateTimes(startTime, endTime) {
  if (!startTime || !endTime) {
    const err = new Error('ساعت شروع و پایان الزامی است.');
    err.status = 400;
    throw err;
  }
}

async function createRule(venueId, { name, daysOfWeek, startTime, endTime, discountPercent }) {
  validateTimes(startTime, endTime);
  const pct = Number(discountPercent);
  if (!name || !(pct > 0 && pct <= 90)) {
    const err = new Error('نام و درصد تخفیف (بین ۱ تا ۹۰) الزامی است.');
    err.status = 400;
    throw err;
  }
  const id = randomUUID();
  await pool.query(
    `INSERT INTO \`HappyHourRule\` (id, venueId, name, daysOfWeek, startTime, endTime, discountPercent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, venueId, name, daysOfWeek ? daysOfWeek.join(',') : null, startTime, endTime, pct]
  );
  return findById('HappyHourRule', id);
}

async function updateRule(id, venueId, data) {
  const rule = await findById('HappyHourRule', id);
  if (!rule || rule.venueId !== venueId) {
    const err = new Error('قانون یافت نشد.');
    err.status = 404;
    throw err;
  }
  const patch = { ...data };
  if (data.daysOfWeek !== undefined) {
    patch.daysOfWeek = Array.isArray(data.daysOfWeek) && data.daysOfWeek.length > 0 ? data.daysOfWeek.join(',') : null;
  }
  return updateById('HappyHourRule', id, patch, [
    'name',
    'daysOfWeek',
    'startTime',
    'endTime',
    'discountPercent',
    'isActive',
  ]);
}

async function deleteRule(id, venueId) {
  const rule = await findById('HappyHourRule', id);
  if (!rule || rule.venueId !== venueId) {
    const err = new Error('قانون یافت نشد.');
    err.status = 404;
    throw err;
  }
  await pool.query('DELETE FROM `HappyHourRule` WHERE id = ?', [id]);
}

// Returns the best-matching (highest discount) active rule for "right now" at
// this venue, or null. Always evaluated server-side at order time — the
// client never gets to assert its own discount.
async function getActiveRule(venueId, at = new Date()) {
  const [rules] = await pool.query(
    'SELECT * FROM `HappyHourRule` WHERE venueId = ? AND isActive = TRUE',
    [venueId]
  );
  const day = at.getDay();
  const hhmmss = at.toTimeString().slice(0, 8);

  const matching = rules.filter((r) => {
    if (r.daysOfWeek) {
      const days = r.daysOfWeek.split(',').map(Number);
      if (!days.includes(day)) return false;
    }
    // Overnight windows (e.g. 22:00–02:00) wrap past midnight.
    if (r.startTime <= r.endTime) {
      return hhmmss >= r.startTime && hhmmss < r.endTime;
    }
    return hhmmss >= r.startTime || hhmmss < r.endTime;
  });

  if (matching.length === 0) return null;
  return matching.reduce((best, r) => (Number(r.discountPercent) > Number(best.discountPercent) ? r : best));
}

module.exports = { listRules, createRule, updateRule, deleteRule, getActiveRule };
