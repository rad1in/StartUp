const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const couponsService = require('../coupons/service');
const { createNotification } = require('../notifications/service');

const MAX_TARGETS_PER_RUN = 50; // cap blast radius of any single automated run

async function getConfig(venueId) {
  const [rows] = await pool.query('SELECT * FROM `SmartCouponConfig` WHERE venueId = ?', [venueId]);
  return (
    rows[0] || {
      venueId,
      isActive: false,
      inactivityDays: 30,
      discountType: 'PERCENT',
      discountValue: 15,
      cooldownDays: 60,
      lastRunAt: null,
    }
  );
}

async function updateConfig(venueId, { isActive, inactivityDays, discountType, discountValue, cooldownDays }) {
  await pool.query(
    `INSERT INTO \`SmartCouponConfig\` (venueId, isActive, inactivityDays, discountType, discountValue, cooldownDays)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       isActive = VALUES(isActive), inactivityDays = VALUES(inactivityDays),
       discountType = VALUES(discountType), discountValue = VALUES(discountValue), cooldownDays = VALUES(cooldownDays)`,
    [
      venueId,
      isActive ? 1 : 0,
      inactivityDays ?? 30,
      discountType || 'PERCENT',
      discountValue ?? 15,
      cooldownDays ?? 60,
    ]
  );
  return getConfig(venueId);
}

async function listLog(venueId) {
  const [rows] = await pool.query(
    `SELECT l.id, l.customerId, l.couponCode, l.sentAt, u.name AS customerName
     FROM \`SmartCouponLog\` l
     JOIN \`User\` u ON u.id = l.customerId
     WHERE l.venueId = ?
     ORDER BY l.sentAt DESC
     LIMIT 100`,
    [venueId]
  );
  return rows;
}

// Finds customers who went quiet (no successful order in inactivityDays) and
// haven't already received an auto-coupon within cooldownDays, then mints one
// each — capped per run so a big idle base doesn't fire hundreds of coupons
// at once.
async function runForVenue(venueId, config) {
  const cfg = config || (await getConfig(venueId));
  if (!cfg.isActive) return { targeted: 0 };

  const [candidates] = await pool.query(
    `SELECT o.customerId, MAX(o.createdAt) AS lastOrderAt
     FROM \`Order\` o
     WHERE o.venueId = ? AND o.customerId IS NOT NULL AND o.paymentStatus = 'SUCCESS'
     GROUP BY o.customerId
     HAVING lastOrderAt < DATE_SUB(NOW(), INTERVAL ? DAY)
     ORDER BY lastOrderAt ASC
     LIMIT ?`,
    [venueId, cfg.inactivityDays, MAX_TARGETS_PER_RUN * 3] // over-fetch, cooldown filter below trims it
  );

  let targeted = 0;
  for (const candidate of candidates) {
    if (targeted >= MAX_TARGETS_PER_RUN) break;

    const [[recent]] = await pool.query(
      `SELECT sentAt FROM \`SmartCouponLog\`
       WHERE venueId = ? AND customerId = ? AND sentAt > DATE_SUB(NOW(), INTERVAL ? DAY)
       LIMIT 1`,
      [venueId, candidate.customerId, cfg.cooldownDays]
    );
    if (recent) continue;

    const code = `WELCOME${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 14 * 24 * 3600 * 1000);
    const coupon = await couponsService.createVenueCoupon(venueId, {
      code,
      discountType: cfg.discountType,
      discountValue: Number(cfg.discountValue),
      expiresAt,
      maxRedemptions: 1,
      minOrderAmount: null,
    });

    const discountLabel =
      coupon.discountType === 'PERCENT'
        ? `${Number(coupon.discountValue)}٪`
        : `${Number(coupon.discountValue).toLocaleString('fa-IR')} تومان`;

    await createNotification(
      candidate.customerId,
      'PROMO',
      'دلمون برات تنگ شده بود! 🎁',
      `کد ${coupon.code} رو استفاده کن و ${discountLabel} تخفیف بگیر — تا ۱۴ روز اعتبار داره.`,
      { couponCode: coupon.code }
    );

    await pool.query('INSERT INTO `SmartCouponLog` (id, venueId, customerId, couponCode) VALUES (?, ?, ?, ?)', [
      randomUUID(),
      venueId,
      candidate.customerId,
      coupon.code,
    ]);
    targeted++;
  }

  await pool.query(
    `INSERT INTO \`SmartCouponConfig\` (venueId, isActive, inactivityDays, discountType, discountValue, cooldownDays, lastRunAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE lastRunAt = NOW()`,
    [venueId, cfg.isActive ? 1 : 0, cfg.inactivityDays, cfg.discountType, cfg.discountValue, cfg.cooldownDays]
  );
  return { targeted };
}

// Polled from server.js — runs at most once a day per active venue.
async function processAllVenues() {
  const [configs] = await pool.query('SELECT * FROM `SmartCouponConfig` WHERE isActive = 1');
  for (const cfg of configs) {
    const last = cfg.lastRunAt ? new Date(cfg.lastRunAt) : null;
    if (last && Date.now() - last.getTime() < 24 * 3600 * 1000) continue;
    try {
      await runForVenue(cfg.venueId, cfg);
    } catch {
      // Skip this venue this cycle; retried on the next poll.
    }
  }
}

module.exports = { getConfig, updateConfig, listLog, runForVenue, processAllVenues };
