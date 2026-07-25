const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById } = require('../../lib/sqlHelpers');
const { emitToVenue } = require('../../sockets');

async function createCall(venueId, tableId, note) {
  const table = await findById('VenueTable', tableId);
  if (!table || table.venueId !== venueId) {
    const err = new Error('میز مورد نظر یافت نشد.');
    err.status = 404;
    throw err;
  }

  const id = randomUUID();
  await pool.query(
    'INSERT INTO `WaiterCall` (id, venueId, tableId, tableNumber, note) VALUES (?, ?, ?, ?, ?)',
    [id, venueId, tableId, table.tableNumber, note || null]
  );

  const call = await findById('WaiterCall', id);
  emitToVenue(venueId, 'waiterCall:new', call);
  return call;
}

async function listPendingForVenue(venueId) {
  const [rows] = await pool.query(
    "SELECT * FROM `WaiterCall` WHERE venueId = ? AND status = 'PENDING' ORDER BY createdAt ASC",
    [venueId]
  );
  return rows;
}

async function resolveCall(venueId, id) {
  const call = await findById('WaiterCall', id);
  if (!call || call.venueId !== venueId) {
    const err = new Error('درخواست مورد نظر یافت نشد.');
    err.status = 404;
    throw err;
  }

  await pool.query("UPDATE `WaiterCall` SET status = 'RESOLVED', resolvedAt = NOW() WHERE id = ?", [id]);
  const updated = await findById('WaiterCall', id);
  emitToVenue(venueId, 'waiterCall:resolved', updated);
  return updated;
}

module.exports = { createCall, listPendingForVenue, resolveCall };
