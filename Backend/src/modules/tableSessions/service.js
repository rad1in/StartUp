const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById } = require('../../lib/sqlHelpers');
const { emitToTableSession } = require('../../sockets');
const ordersService = require('../orders/service');
const { getFeatureFlags } = require('../content/service');

function assertParticipantShape({ userId, guestName }) {
  if ((userId && guestName) || (!userId && !guestName)) {
    const err = new Error('شرکت‌کننده باید یا کاربر ثبت‌نام‌شده یا مهمان با نام باشد.');
    err.status = 400;
    throw err;
  }
}

async function insertParticipant(sessionId, { userId, guestName }) {
  assertParticipantShape({ userId, guestName });
  const id = randomUUID();
  await pool.query('INSERT INTO `TableSessionParticipant` (id, sessionId, userId, guestName) VALUES (?, ?, ?, ?)', [
    id,
    sessionId,
    userId || null,
    guestName || null,
  ]);
  return findById('TableSessionParticipant', id);
}

async function getActiveSessionOrThrow(sessionId) {
  const session = await findById('TableSession', sessionId);
  if (!session) {
    const err = new Error('سشن سفارش گروهی یافت نشد.');
    err.status = 404;
    throw err;
  }
  if (session.status !== 'ACTIVE') {
    const err = new Error('این سفارش گروهی بسته شده است.');
    err.status = 400;
    throw err;
  }
  return session;
}

async function createSession(venueId, tableId, creator) {
  const flags = await getFeatureFlags();
  if (!flags.groupOrdering) {
    const err = new Error('سفارش گروهی موقتاً غیرفعال است.');
    err.status = 403;
    throw err;
  }
  const id = randomUUID();
  await pool.query('INSERT INTO `TableSession` (id, venueId, tableId) VALUES (?, ?, ?)', [id, venueId, tableId]);
  const participant = await insertParticipant(id, creator);
  return listSession(id, participant.id);
}

async function joinSession(sessionId, participantInput) {
  await getActiveSessionOrThrow(sessionId);
  const participant = await insertParticipant(sessionId, participantInput);
  const session = await listSession(sessionId, participant.id);
  emitToTableSession(sessionId, 'session:participant-joined', { participant: session.you });
  return session;
}

// Attaches the human-readable label (guest name, or the linked user's real
// name) to each participant — used both for display and for stamping
// `OrderItem.addedByLabel` at checkout time.
async function participantsWithLabels(sessionId) {
  const [rows] = await pool.query(
    `SELECT tsp.*, u.name AS userName FROM \`TableSessionParticipant\` tsp
     LEFT JOIN \`User\` u ON u.id = tsp.userId
     WHERE tsp.sessionId = ? ORDER BY tsp.joinedAt ASC`,
    [sessionId]
  );
  return rows.map((row) => ({ ...row, label: row.guestName || row.userName || 'مهمان' }));
}

async function itemsWithDetails(sessionId, participants) {
  const [rows] = await pool.query(
    `SELECT tsi.*, mi.name AS menuItemName, mi.price AS menuItemPrice, mi.imageUrl AS menuItemImageUrl,
            c.name AS comboName, c.price AS comboPrice
     FROM \`TableSessionItem\` tsi
     LEFT JOIN \`MenuItem\` mi ON mi.id = tsi.menuItemId
     LEFT JOIN \`Combo\` c ON c.id = tsi.comboId
     WHERE tsi.sessionId = ? ORDER BY tsi.createdAt ASC`,
    [sessionId]
  );
  const labelByParticipant = new Map(participants.map((p) => [p.id, p.label]));
  return rows.map((row) => ({
    id: row.id,
    participantId: row.participantId,
    addedByLabel: labelByParticipant.get(row.participantId) || 'مهمان',
    menuItemId: row.menuItemId,
    comboId: row.comboId,
    name: row.menuItemName || row.comboName,
    unitPrice: Number(row.menuItemPrice ?? row.comboPrice ?? 0),
    quantity: row.quantity,
    variantSelections: row.variantSelections || null,
    imageUrl: row.menuItemImageUrl || null,
  }));
}

async function listSession(sessionId, viewerParticipantId = null) {
  const session = await findById('TableSession', sessionId);
  if (!session) {
    const err = new Error('سشن سفارش گروهی یافت نشد.');
    err.status = 404;
    throw err;
  }
  const participants = await participantsWithLabels(sessionId);
  const items = await itemsWithDetails(sessionId, participants);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return {
    ...session,
    participants,
    items,
    subtotal,
    you: viewerParticipantId ? participants.find((p) => p.id === viewerParticipantId) || null : null,
  };
}

async function addItem(sessionId, participantId, { menuItemId, comboId, quantity, variantSelections }) {
  await getActiveSessionOrThrow(sessionId);
  if ((!menuItemId && !comboId) || (menuItemId && comboId)) {
    const err = new Error('هر آیتم باید شناسه منو یا کمبو داشته باشد.');
    err.status = 400;
    throw err;
  }
  const id = randomUUID();
  await pool.query(
    `INSERT INTO \`TableSessionItem\` (id, sessionId, participantId, menuItemId, comboId, quantity, variantSelections)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, sessionId, participantId, menuItemId || null, comboId || null, quantity || 1, variantSelections ? JSON.stringify(variantSelections) : null]
  );
  const session = await listSession(sessionId);
  emitToTableSession(sessionId, 'session:item-added', { sessionId, items: session.items, subtotal: session.subtotal });
  return session;
}

async function removeItem(sessionId, itemId) {
  await getActiveSessionOrThrow(sessionId);
  await pool.query('DELETE FROM `TableSessionItem` WHERE id = ? AND sessionId = ?', [itemId, sessionId]);
  const session = await listSession(sessionId);
  emitToTableSession(sessionId, 'session:item-removed', { sessionId, items: session.items, subtotal: session.subtotal });
  return session;
}

// Reads the session's own items server-side (never trusts a client-submitted
// item list, same principle `orders/service.createOrder` already follows),
// stamps each resulting OrderItem with the contributing participant's label,
// then closes the session.
async function checkoutSession(sessionId, checkoutUserId = null) {
  const session = await getActiveSessionOrThrow(sessionId);
  const participants = await participantsWithLabels(sessionId);
  const labelByParticipant = new Map(participants.map((p) => [p.id, p.label]));

  const [itemRows] = await pool.query('SELECT * FROM `TableSessionItem` WHERE sessionId = ?', [sessionId]);
  if (itemRows.length === 0) {
    const err = new Error('سبد سفارش گروهی خالی است.');
    err.status = 400;
    throw err;
  }

  const items = itemRows.map((row) => ({
    menuItemId: row.menuItemId,
    comboId: row.comboId,
    quantity: row.quantity,
    variantSelections: row.variantSelections || null,
    addedByLabel: labelByParticipant.get(row.participantId) || 'مهمان',
  }));

  const order = await ordersService.createOrder({
    venueId: session.venueId,
    tableId: session.tableId,
    customerId: checkoutUserId,
    items,
  });

  await pool.query('UPDATE `TableSession` SET status = ?, closedAt = NOW(), orderId = ? WHERE id = ?', [
    'CLOSED',
    order.id,
    sessionId,
  ]);
  emitToTableSession(sessionId, 'session:closed', { sessionId, orderId: order.id });

  return order;
}

module.exports = {
  createSession,
  joinSession,
  listSession,
  addItem,
  removeItem,
  checkoutSession,
};
