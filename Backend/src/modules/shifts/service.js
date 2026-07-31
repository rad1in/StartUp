const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, updateById, deleteById } = require('../../lib/sqlHelpers');

async function listShifts(venueId, { userId, from, to } = {}) {
  const conditions = ['s.venueId = ?'];
  const params = [venueId];
  if (userId) {
    conditions.push('s.userId = ?');
    params.push(userId);
  }
  if (from) {
    conditions.push('s.scheduledEnd >= ?');
    params.push(new Date(from));
  }
  if (to) {
    conditions.push('s.scheduledStart <= ?');
    params.push(new Date(to));
  }
  const [rows] = await pool.query(
    `SELECT s.*, u.name AS userName FROM \`Shift\` s
     JOIN \`User\` u ON u.id = s.userId
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.scheduledStart ASC`,
    params
  );
  return rows;
}

async function createShift(venueId, { userId, scheduledStart, scheduledEnd, note }) {
  if (!userId || !scheduledStart || !scheduledEnd) {
    const err = new Error('کارمند و بازه زمانی شیفت الزامی است.');
    err.status = 400;
    throw err;
  }
  if (new Date(scheduledEnd) <= new Date(scheduledStart)) {
    const err = new Error('پایان شیفت باید بعد از شروع آن باشد.');
    err.status = 400;
    throw err;
  }
  const [[staffRow]] = await pool.query('SELECT id FROM `User` WHERE id = ? AND venueId = ?', [userId, venueId]);
  if (!staffRow) {
    const err = new Error('این کاربر عضو این مجموعه نیست.');
    err.status = 400;
    throw err;
  }
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `Shift` (id, venueId, userId, scheduledStart, scheduledEnd, note) VALUES (?, ?, ?, ?, ?, ?)',
    [id, venueId, userId, new Date(scheduledStart), new Date(scheduledEnd), note || null]
  );
  return findById('Shift', id);
}

async function updateShift(id, data) {
  const patch = { ...data };
  if (patch.scheduledStart) patch.scheduledStart = new Date(patch.scheduledStart);
  if (patch.scheduledEnd) patch.scheduledEnd = new Date(patch.scheduledEnd);
  return updateById('Shift', id, patch, ['scheduledStart', 'scheduledEnd', 'note']);
}

async function deleteShift(id) {
  return deleteById('Shift', id);
}

async function clockIn(shiftId, userId) {
  const shift = await findById('Shift', shiftId);
  if (!shift || shift.userId !== userId) {
    const err = new Error('این شیفت متعلق به شما نیست.');
    err.status = 403;
    throw err;
  }
  if (shift.clockInAt) {
    const err = new Error('برای این شیفت قبلا ورود ثبت شده است.');
    err.status = 400;
    throw err;
  }
  await pool.query('UPDATE `Shift` SET clockInAt = NOW() WHERE id = ?', [shiftId]);
  return findById('Shift', shiftId);
}

async function clockOut(shiftId, userId) {
  const shift = await findById('Shift', shiftId);
  if (!shift || shift.userId !== userId) {
    const err = new Error('این شیفت متعلق به شما نیست.');
    err.status = 403;
    throw err;
  }
  if (!shift.clockInAt) {
    const err = new Error('ابتدا باید ورود خود را ثبت کنید.');
    err.status = 400;
    throw err;
  }
  if (shift.clockOutAt) {
    const err = new Error('برای این شیفت قبلا خروج ثبت شده است.');
    err.status = 400;
    throw err;
  }
  await pool.query('UPDATE `Shift` SET clockOutAt = NOW() WHERE id = ?', [shiftId]);
  return findById('Shift', shiftId);
}

module.exports = { listShifts, createShift, updateShift, deleteShift, clockIn, clockOut };
