const dns = require('dns').promises;
const crypto = require('crypto');
const net = require('net');

// Blocks SSRF: a venue owner supplies the webhook URL, so before ever making
// a server-side request to it we must reject anything pointing at loopback,
// link-local, or private-network addresses (including via DNS rebinding —
// we resolve the hostname ourselves rather than trusting fetch's resolver).
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // RFC1918
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 0) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1') return true; // loopback
    if (lower.startsWith('fe80:')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    return false;
  }
  return true; // unparsable — treat as unsafe
}

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

async function validateWebhookUrl(urlStr) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw badRequest('آدرس وب‌هوک نامعتبر است.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw badRequest('فقط آدرس‌های http یا https مجاز است.');
  }
  if (parsed.hostname === 'localhost') {
    throw badRequest('آدرس وب‌هوک نمی‌تواند به شبکه داخلی اشاره کند.');
  }
  let addresses;
  try {
    addresses = await dns.lookup(parsed.hostname, { all: true });
  } catch {
    throw badRequest('آدرس وب‌هوک قابل تشخیص نیست.');
  }
  if (addresses.some((a) => isPrivateIp(a.address))) {
    throw badRequest('آدرس وب‌هوک نمی‌تواند به شبکه داخلی اشاره کند.');
  }
  return parsed;
}

function signPayload(secret, bodyStr) {
  return crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
}

// Fire-and-forget delivery with a short timeout; caller persists the outcome.
async function deliverWebhook(url, secret, event, payload) {
  const bodyStr = JSON.stringify({ event, payload, sentAt: new Date().toISOString() });
  const signature = signPayload(secret, bodyStr);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature, 'X-Webhook-Event': event },
      body: bodyStr,
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { validateWebhookUrl, deliverWebhook, signPayload, isPrivateIp };
