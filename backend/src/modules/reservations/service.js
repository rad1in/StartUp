const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, updateById } = require('../../lib/sqlHelpers');
const { createNotification } = require('../notifications/service');
const { emitToVenue } = require('../../sockets');
const { getFeatureFlags } = require('../content/service');

// A reservation "occupies" a table for roughly this long — used to decide
// whether a venue has any free table left at the requested time, and how
// wide a window to search when a cancellation frees one up for the waitlist.
const SLOT_WINDOW_MINUTES = 90;

function validatePhone(phone) {
  const p = String(phone || '').trim();
  if (!/^09\d{9}$/.test(p)) {
    const err = new Error('شماره موبایل معتبر نیست.');
    err.status = 400;
    throw err;
  }
  return p;
}

function slotWindow(time) {
  const halfMs = (SLOT_WINDOW_MINUTES / 2) * 60 * 1000;
  return { from: new Date(time.getTime() - halfMs), to: new Date(time.getTime() + halfMs) };
}

async function countActiveReservationsInWindow(venueId, time) {
  const { from, to } = slotWindow(time);
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM \`Reservation\`
     WHERE venueId = ? AND status IN ('PENDING','CONFIRMED') AND reservationTime BETWEEN ? AND ?`,
    [venueId, from, to]
  );
  return row.cnt;
}

async function isVenueFullAt(venueId, time) {
  const [[{ totalTables }]] = await pool.query(
    'SELECT COUNT(*) AS totalTables FROM `VenueTable` WHERE venueId = ?',
    [venueId]
  );
  if (totalTables === 0) return false; // no tables configured yet — don't block reservations on it
  const activeCount = await countActiveReservationsInWindow(venueId, time);
  return activeCount >= totalTables;
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
  if (!tableId && (await isVenueFullAt(venueId, time))) {
    const err = new Error(
      'همه میزهای مجموعه در این بازه زمانی رزرو شده‌اند. می‌توانید در لیست انتظار قرار بگیرید تا به محض آزاد شدن یک میز به شما اطلاع داده شود.'
    );
    err.status = 409;
    err.code = 'VENUE_FULL';
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

  if (status === 'CANCELLED') {
    await notifyNextWaitlistEntry(venueId, reservation.reservationTime).catch(() => {});
  }

  return updated;
}

// A cancellation just freed up a table — tell whoever has been waiting the
// longest for a slot near that time, so they get first shot at rebooking.
async function notifyNextWaitlistEntry(venueId, cancelledTime) {
  const { from, to } = slotWindow(new Date(cancelledTime));
  const [[entry]] = await pool.query(
    `SELECT * FROM \`ReservationWaitlist\`
     WHERE venueId = ? AND status = 'WAITING' AND requestedTime BETWEEN ? AND ?
     ORDER BY createdAt ASC LIMIT 1`,
    [venueId, from, to]
  );
  if (!entry) return;
  await updateById('ReservationWaitlist', entry.id, { status: 'NOTIFIED' }, ['status']);
  if (entry.customerId) {
    await createNotification(
      entry.customerId,
      'SYSTEM',
      'یک میز برایتان آزاد شد!',
      'یک میز در بازه زمانی درخواستی شما آزاد شده است. برای رزرو، هرچه سریع‌تر دوباره اقدام کنید.'
    ).catch(() => {});
  }
}

async function joinWaitlist(venueId, { guestName, guestPhone, partySize, requestedTime, notes }, customerId = null) {
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
  const time = new Date(requestedTime);
  if (Number.isNaN(time.getTime()) || time < new Date()) {
    const err = new Error('زمان درخواستی نامعتبر است.');
    err.status = 400;
    throw err;
  }
  const id = randomUUID();
  await pool.query(
    `INSERT INTO \`ReservationWaitlist\` (id, venueId, customerId, guestName, guestPhone, partySize, requestedTime, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, venueId, customerId, guestName.trim(), phone, Number(partySize) || 2, time, notes || null]
  );
  return findById('ReservationWaitlist', id);
}

async function listWaitlist(venueId, { status } = {}) {
  const conditions = ['venueId = ?'];
  const params = [venueId];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  const [rows] = await pool.query(
    `SELECT * FROM \`ReservationWaitlist\` WHERE ${conditions.join(' AND ')} ORDER BY requestedTime ASC`,
    params
  );
  return rows;
}

async function updateWaitlistStatus(venueId, id, status) {
  const entry = await findById('ReservationWaitlist', id);
  if (!entry || entry.venueId !== venueId) {
    const err = new Error('مورد لیست انتظار یافت نشد.');
    err.status = 404;
    throw err;
  }
  return updateById('ReservationWaitlist', id, { status }, ['status']);
}

module.exports = {
  createReservation,
  listReservations,
  updateReservationStatus,
  joinWaitlist,
  listWaitlist,
  updateWaitlistStatus,
};
