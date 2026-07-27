const { randomUUID } = require('crypto');
const { pool } = require('../lib/db');
const { renderStatusPage, sendStatus } = require('../lib/statusPage');

// Node/Express can report the same client address in different string forms
// depending on the connection path — a dual-stack socket gives IPv4 clients
// as an IPv4-mapped IPv6 address ("::ffff:1.2.3.4") instead of the plain
// dotted form, and localhost loopback shows up as "::1". Both the check and
// every write path normalize through this so a stored "1.2.3.4" actually
// matches the request that IP generates.
function normalizeIp(ip) {
  if (!ip) return ip;
  return ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip;
}

// Checked on every request before any route logic runs. Blocking an IP is
// fully reversible (an admin can remove or shorten the row any time) —
// unlike wiping data, there is no failure mode here worse than a legitimate
// visitor sharing a NAT'd IP with a blocked one getting a temporary 403.
async function ipBlocklistMiddleware(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id FROM `BlockedIp` WHERE ip = ? AND (expiresAt IS NULL OR expiresAt > NOW()) LIMIT 1',
      [normalizeIp(req.ip)]
    );
    if (rows.length > 0) {
      return sendStatus(req, res, {
        code: 403,
        json: { message: 'دسترسی شما به این سرویس مسدود شده است.' },
        html: () =>
          renderStatusPage({
            title: '403 — Access Blocked',
            subtitle: 'Access to this service has been blocked.',
            tone: 'err',
            code: 403,
            links: [],
          }),
      });
    }
  } catch (err) {
    // Never let a DB hiccup on this check take the whole API down — fail open.
    console.error('[ipBlocklist] check failed:', err.message);
  }
  next();
}

// Auto-block hook for the auth rate limiter (see middleware/rateLimit.js) —
// always temporary, so a shared IP with one bad actor recovers on its own.
async function autoBlockIp(ip, reason, durationMs = 60 * 60 * 1000) {
  try {
    await pool.query(
      `INSERT INTO \`BlockedIp\` (id, ip, reason, source, expiresAt)
       VALUES (?, ?, ?, 'AUTO_RATE_LIMIT', DATE_ADD(NOW(), INTERVAL ? SECOND))
       ON DUPLICATE KEY UPDATE reason = VALUES(reason), source = VALUES(source), expiresAt = VALUES(expiresAt)`,
      [randomUUID(), normalizeIp(ip), reason, Math.round(durationMs / 1000)]
    );
  } catch (err) {
    console.error('[ipBlocklist] autoBlockIp failed:', err.message);
  }
}

module.exports = { ipBlocklistMiddleware, autoBlockIp, normalizeIp };
