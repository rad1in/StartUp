const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, updateById } = require('../../lib/sqlHelpers');
const { createNotification } = require('../notifications/service');
const { emitToVenue } = require('../../sockets');
const { getFeatureFlags } = require('../content/service');

function validatePhone(phone) {
  const p = String(phone || '').trim();
  if (!/^09\d{9}$/.test(p)) {
    const err = new Error('شماره موبایل معتبر نیست.');
    err.status = 400;
    throw err;
  }
  return p;
}

async function createReservation(venueId, { tableId, guestName, guestPhone, partySize, reservationTime, notes }, customerId = null) {
  const flags = await getFeatureFlags();
  if (!flags.reservations) {
    const err = new Error('رزرو میز موقتاً غیرفعال است.');
    err.status = 403;
    throw err;
  }
  const venue = await findById('Venue', venueId);
  if (!venue) {
    const err = new Error('مجموعه یافت نشد.');
    err.status = 404;
    throw err;
  }
  if (!guestName || !guestName.trim()) {
    const err = new Error('نام الزامی است.');
    err.status = 400;
    throw err;
  }
  const phone = validatePhone(guestPhone);
  const time = new Date(reservationTime);
  if (Number.isNaN(time.getTime()) || time < new Date()) {
    const err = new Error('زمان رزرو نامعتبر است.');
    err.status = 400;
    throw err;
  }
  const id = randomUUID();
  await pool.query(
    `INSERT INTO \`Reservation\` (id, venueId, tableId, customerId, guestName, guestPhone, partySize, reservationTime, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, venueId, tableId || null, customerId, guestName.trim(), phone, Number(partySize) || 2, time, notes || null]
  );
  const reservation = await findById('Reservation', id);
  emitToVenue(venueId, 'reservation:new', reservation);
  return reservation;
}

async function listReservations(venueId, { from, to, status } = {}) {
  const conditions = ['r.venueId = ?'];
  const params = [venueId];
  if (from) {
    conditions.push('r.reservationTime >= ?');
    params.push(new Date(from));
  }
  if (to) {
    conditions.push('r.reservationTime <= ?');
    params.push(new Date(to));
  }
  if (status) {
    conditions.push('r.status = ?');
    params.push(status);
  }
  const [rows] = await pool.query(
    `SELECT r.*, t.tableNumber FROM \`Reservation\` r LEFT JOIN \`VenueTable\` t ON t.id = r.tableId
     WHERE ${conditions.join(' AND ')} ORDER BY reservationTime ASC`,
    params
  );
  return rows;
}

async function updateReservationStatus(venueId, id, status) {
  const reservation = await findById('Reservation', id);
  if (!reservation || reservation.venueId !== venueId) {
    const err = new Error('رزرو یافت نشد.');
    err.status = 404;
    throw err;
  }
  const updated = await updateById('Reservation', id, { status }, ['status']);

  if (reservation.customerId && ['CONFIRMED', 'CANCELLED'].includes(status)) {
    const label = status === 'CONFIRMED' ? 'تایید شد' : 'لغو شد';
    await createNotification(
      reservation.customerId,
      'SYSTEM',
      `رزرو میز شما ${label}`,
      `رزرو شما برای ${new Date(reservation.reservationTime).toLocaleString('fa-IR')} ${label.toLowerCase()}.`
    ).catch(() => {});
  }
  return updated;
}

module.exports = { createReservation, listReservations, updateReservationStatus };
