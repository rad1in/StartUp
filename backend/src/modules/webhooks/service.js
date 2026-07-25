const { randomUUID, randomBytes } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, deleteById } = require('../../lib/sqlHelpers');
const { validateWebhookUrl, deliverWebhook } = require('../../lib/webhookDelivery');

const ALLOWED_EVENTS = ['order.created', 'order.statusChanged', 'order.voided'];

function maskWebhook(row) {
  return { ...row, secret: undefined, secretPreview: `${row.secret.slice(0, 6)}…` };
}

async function listWebhooks(venueId) {
  const [rows] = await pool.query('SELECT * FROM `Webhook` WHERE venueId = ? ORDER BY createdAt DESC', [venueId]);
  return rows.map((r) => ({ ...maskWebhook(r), events: JSON.parse(r.events) }));
}

async function createWebhook(venueId, { url, events }) {
  await validateWebhookUrl(url);
  const validEvents = (Array.isArray(events) ? events : []).filter((e) => ALLOWED_EVENTS.includes(e));
  if (validEvents.length === 0) throw Object.assign(new Error('حداقل یک رویداد معتبر باید انتخاب شود.'), { status: 400 });

  const id = randomUUID();
  const secret = randomBytes(24).toString('hex');
  await pool.query('INSERT INTO `Webhook` (id, venueId, url, secret, events, isActive) VALUES (?, ?, ?, ?, ?, 1)', [
    id,
    venueId,
    url,
    secret,
    JSON.stringify(validEvents),
  ]);
  const row = await findById('Webhook', id);
  // Secret is only ever returned in full at creation time (Stripe/GitHub pattern).
  return { ...row, events: validEvents };
}

async function assertOwnership(id, venueId) {
  const row = await findById('Webhook', id);
  if (!row || row.venueId !== venueId) throw Object.assign(new Error('وب‌هوک یافت نشد.'), { status: 404 });
  return row;
}

async function toggleWebhook(venueId, id, isActive) {
  await assertOwnership(id, venueId);
  await pool.query('UPDATE `Webhook` SET isActive = ? WHERE id = ?', [isActive ? 1 : 0, id]);
  const row = await findById('Webhook', id);
  return { ...maskWebhook(row), events: JSON.parse(row.events) };
}

async function deleteWebhook(venueId, id) {
  await assertOwnership(id, venueId);
  return deleteById('Webhook', id);
}

async function testWebhook(venueId, id) {
  const row = await assertOwnership(id, venueId);
  const result = await deliverWebhook(row.url, row.secret, 'webhook.test', { message: 'این یک پیام آزمایشی از ET-Cafe است.' });
  await pool.query('UPDATE `Webhook` SET lastTriggeredAt = NOW(), lastStatus = ?, lastError = ? WHERE id = ?', [
    result.ok ? 'SUCCESS' : 'FAILED',
    result.error || (result.ok ? null : `HTTP ${result.status}`),
    id,
  ]);
  return result;
}

// Called from order lifecycle hooks (fire-and-forget — never blocks the request).
async function triggerEvent(venueId, event, payload) {
  const [rows] = await pool.query('SELECT * FROM `Webhook` WHERE venueId = ? AND isActive = 1', [venueId]);
  for (const row of rows) {
    const events = JSON.parse(row.events);
    if (!events.includes(event)) continue;
    deliverWebhook(row.url, row.secret, event, payload)
      .then((result) =>
        pool.query('UPDATE `Webhook` SET lastTriggeredAt = NOW(), lastStatus = ?, lastError = ? WHERE id = ?', [
          result.ok ? 'SUCCESS' : 'FAILED',
          result.error || (result.ok ? null : `HTTP ${result.status}`),
          row.id,
        ])
      )
      .catch(() => {});
  }
}

module.exports = { ALLOWED_EVENTS, listWebhooks, createWebhook, toggleWebhook, deleteWebhook, testWebhook, triggerEvent };
