const { randomUUID } = require('crypto');
const webpush = require('web-push');
const { pool } = require('../../lib/db');
const { config } = require('../../config/config');

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  if (!config.vapid.publicKey || !config.vapid.privateKey) return false;
  webpush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);
  configured = true;
  return true;
}

async function subscribe(userId, subscription, userAgent) {
  const { endpoint, keys } = subscription;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    const err = new Error('اشتراک نامعتبر است.');
    err.status = 400;
    throw err;
  }
  await pool.query(
    `INSERT INTO \`PushSubscription\` (id, userId, endpoint, p256dh, auth, userAgent) VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE userId = VALUES(userId), p256dh = VALUES(p256dh), auth = VALUES(auth)`,
    [randomUUID(), userId, endpoint, keys.p256dh, keys.auth, userAgent || null]
  );
  return { subscribed: true };
}

async function unsubscribe(userId, endpoint) {
  await pool.query('DELETE FROM `PushSubscription` WHERE userId = ? AND endpoint = ?', [userId, endpoint]);
  return { subscribed: false };
}

// --- Expo push tokens (mobile app) — same idea as PushSubscription above,
// just a different transport (Expo's relay to APNs/FCM instead of Web Push).
async function registerExpoToken(userId, token, deviceInfo) {
  if (!token || !token.startsWith('ExponentPushToken')) {
    const err = new Error('توکن اعلان نامعتبر است.');
    err.status = 400;
    throw err;
  }
  await pool.query(
    `INSERT INTO \`ExpoPushToken\` (id, userId, token, deviceInfo) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE userId = VALUES(userId), deviceInfo = VALUES(deviceInfo)`,
    [randomUUID(), userId, token, deviceInfo || null]
  );
  return { registered: true };
}

async function unregisterExpoToken(userId, token) {
  await pool.query('DELETE FROM `ExpoPushToken` WHERE userId = ? AND token = ?', [userId, token]);
  return { registered: false };
}

// Expo's push API accepts batches of up to 100 messages per request.
async function sendExpoPush(tokens, { title, body, data }) {
  if (tokens.length === 0) return;
  const messages = tokens.map((to) => ({ to, title, body, data: data || {}, sound: 'default' }));
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch {
    /* best-effort, mirrors sendPushToUser's failure handling below */
  }
}

// Fire-and-forget: sends to every device the user has subscribed on (both
// web push and the Expo/mobile app). A push failing (expired subscription,
// app uninstalled, etc.) just prunes that one row — it must never affect the
// caller (the in-app Notification already succeeded; push is a bonus
// delivery channel, not the source of truth).
async function sendPushToUser(userId, { title, body, url, tag, data }) {
  const [expoTokens] = await pool.query('SELECT token FROM `ExpoPushToken` WHERE userId = ?', [userId]);
  if (expoTokens.length > 0) {
    await sendExpoPush(expoTokens.map((r) => r.token), { title, body, data: data || { url: url || '/', tag } });
  }

  if (!ensureConfigured()) return;
  const [subs] = await pool.query('SELECT * FROM `PushSubscription` WHERE userId = ?', [userId]);
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body, url: url || '/', tag: tag || 'et-cafe' });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        // 404/410 = the subscription is dead (browser data cleared, uninstalled, etc.)
        if (err.statusCode === 404 || err.statusCode === 410) {
          await pool.query('DELETE FROM `PushSubscription` WHERE id = ?', [sub.id]).catch(() => {});
        }
      }
    })
  );
}

module.exports = {
  subscribe,
  unsubscribe,
  registerExpoToken,
  unregisterExpoToken,
  sendPushToUser,
  ensureConfigured,
};
