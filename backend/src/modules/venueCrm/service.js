const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const couponsService = require('../coupons/service');
const { createNotification } = require('../notifications/service');

// Simple RFM (recency/frequency/monetary) roll-up per customer, scoped to one
// venue — enough to spot regulars worth rewarding without a full analytics
// stack. Only successful (paid) orders count toward the numbers.
async function listCustomers(venueId, { search } = {}) {
  const params = [venueId];
  let searchClause = '';
  if (search) {
    searchClause = ' AND (u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  const [rows] = await pool.query(
    `SELECT o.customerId, u.name, u.phone, u.email,
            COUNT(*) AS orderCount,
            SUM(o.totalAmount) AS totalSpent,
            MAX(o.createdAt) AS lastOrderAt
     FROM \`Order\` o
     JOIN \`User\` u ON u.id = o.customerId
     WHERE o.venueId = ? AND o.customerId IS NOT NULL AND o.paymentStatus = 'SUCCESS'${searchClause}
     GROUP BY o.customerId, u.name, u.phone, u.email
     ORDER BY totalSpent DESC`,
    params
  );

  const now = Date.now();
  return rows.map((r) => ({
    customerId: r.customerId,
    name: r.name,
    phone: r.phone,
    email: r.email,
    orderCount: Number(r.orderCount),
    totalSpent: Number(r.totalSpent),
    lastOrderAt: r.lastOrderAt,
    recencyDays: Math.floor((now - new Date(r.lastOrderAt).getTime()) / (24 * 60 * 60 * 1000)),
  }));
}

// Mint a single-use, single-customer coupon and notify that customer directly
// — reuses the existing venue coupon machinery (maxRedemptions caps it at 1),
// so validation/redemption logic doesn't need to know this is "personal".
async function sendCustomerCoupon(venueId, customerId, { discountType, discountValue, expiresAt, message }) {
  const code = `VIP${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const coupon = await couponsService.createVenueCoupon(venueId, {
    code,
    discountType: discountType || 'PERCENT',
    discountValue: Number(discountValue) || 10,
    expiresAt: expiresAt || null,
    maxRedemptions: 1,
    minOrderAmount: null,
  });

  const discountLabel =
    coupon.discountType === 'PERCENT' ? `${Number(coupon.discountValue)}٪` : `${Number(coupon.discountValue).toLocaleString('fa-IR')} تومان`;

  await createNotification(
    customerId,
    'PROMO',
    'یک هدیه ویژه برای شما!',
    message || `کد تخفیف اختصاصی ${coupon.code} (${discountLabel} تخفیف) فقط برای شماست.`,
    { couponCode: coupon.code }
  );

  return coupon;
}

module.exports = { listCustomers, sendCustomerCoupon };
