const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById } = require('../../lib/sqlHelpers');
const { updatePaymentStatus } = require('../orders/service');

async function listShares(orderId) {
  const [rows] = await pool.query(
    `SELECT bs.*, tsp.displayName AS participantName
     FROM \`BillShare\` bs
     LEFT JOIN \`TableSessionParticipant\` tsp ON tsp.id = bs.participantId
     WHERE bs.orderId = ? ORDER BY bs.createdAt ASC`,
    [orderId]
  );
  return rows;
}

async function createEqualSplit(orderId, labels) {
  const order = await findById('Order', orderId);
  if (!order) {
    const err = new Error('سفارش یافت نشد.');
    err.status = 404;
    throw err;
  }
  if (!labels || labels.length < 2) {
    const err = new Error('تقسیم مساوی نیاز به حداقل ۲ نام دارد.');
    err.status = 400;
    throw err;
  }

  const perShare = Math.floor((Number(order.totalAmount) / labels.length) * 100) / 100;
  const total = Number(order.totalAmount);
  const rows = labels.map((label, i) => {
    const isLast = i === labels.length - 1;
    const amount = isLast
      ? Math.round((total - perShare * (labels.length - 1)) * 100) / 100
      : perShare;
    return [randomUUID(), orderId, label, amount, 'PENDING', null];
  });

  await pool.query('DELETE FROM `BillShare` WHERE orderId = ?', [orderId]);
  await pool.query(
    'INSERT INTO `BillShare` (id, orderId, label, amount, paymentStatus, participantId) VALUES ?',
    [rows]
  );

  return listShares(orderId);
}

async function createItemizedSplit(orderId, assignments) {
  const order = await findById('Order', orderId);
  if (!order) {
    const err = new Error('سفارش یافت نشد.');
    err.status = 404;
    throw err;
  }

  const [itemRows] = await pool.query('SELECT id, subtotal FROM `OrderItem` WHERE orderId = ?', [orderId]);
  const itemById = new Map(itemRows.map((r) => [r.id, Number(r.subtotal)]));

  const shares = assignments.map((a, i) => {
    const amount = (a.itemIds || []).reduce((sum, itemId) => {
      return sum + (itemById.get(itemId) || 0);
    }, 0);
    return { id: randomUUID(), orderId, label: a.label, amount, participantId: a.participantId || null };
  });

  // Absorb rounding on last share
  const sumAssigned = shares.reduce((s, r) => s + r.amount, 0);
  const diff = Math.round((Number(order.totalAmount) - sumAssigned) * 100) / 100;
  if (shares.length > 0) shares[shares.length - 1].amount = Math.round((shares[shares.length - 1].amount + diff) * 100) / 100;

  await pool.query('DELETE FROM `BillShare` WHERE orderId = ?', [orderId]);
  const rows = shares.map((s) => [s.id, s.orderId, s.label, s.amount, 'PENDING', s.participantId]);
  await pool.query(
    'INSERT INTO `BillShare` (id, orderId, label, amount, paymentStatus, participantId) VALUES ?',
    [rows]
  );

  return listShares(orderId);
}

async function markSharePaid(shareId) {
  await pool.query("UPDATE `BillShare` SET paymentStatus = 'SUCCESS' WHERE id = ?", [shareId]);

  const [shareRows] = await pool.query('SELECT orderId FROM `BillShare` WHERE id = ?', [shareId]);
  if (!shareRows[0]) return;
  const { orderId } = shareRows[0];

  const [pendingRows] = await pool.query(
    "SELECT COUNT(*) AS cnt FROM `BillShare` WHERE orderId = ? AND paymentStatus != 'SUCCESS'",
    [orderId]
  );
  if (pendingRows[0].cnt === 0) {
    await updatePaymentStatus(orderId, 'SUCCESS');
  }
}

async function autoCreateFromSession(orderId, sessionId) {
  const [participants] = await pool.query(
    'SELECT * FROM `TableSessionParticipant` WHERE sessionId = ?',
    [sessionId]
  );
  if (participants.length === 0) return [];

  const [sessionItems] = await pool.query(
    'SELECT tsi.*, oi.id AS orderItemId FROM `TableSessionItem` tsi JOIN `OrderItem` oi ON oi.menuItemId = tsi.menuItemId AND oi.orderId = ? WHERE tsi.sessionId = ?',
    [orderId, sessionId]
  );

  const assignments = participants.map((p) => ({
    label: p.displayName,
    participantId: p.id,
    itemIds: sessionItems.filter((i) => i.addedByParticipantId === p.id).map((i) => i.orderItemId),
  }));

  const hasAnyItems = assignments.some((a) => a.itemIds.length > 0);
  if (!hasAnyItems) {
    return createEqualSplit(orderId, participants.map((p) => p.displayName));
  }
  return createItemizedSplit(orderId, assignments);
}

module.exports = { listShares, createEqualSplit, createItemizedSplit, markSharePaid, autoCreateFromSession };
