const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, updateById, deleteById } = require('../../lib/sqlHelpers');
const { createNotification } = require('../notifications/service');

async function findCouponByCode(executor, code) {
  const [rows] = await executor.query('SELECT * FROM `Coupon` WHERE code = ?', [code]);
  return rows[0] || null;
}

function computeDiscount(coupon, subtotal) {
  if (coupon.discountType === 'PERCENT') {
    return Math.round((subtotal * Number(coupon.discountValue)) / 100);
  }
  return Math.min(Number(coupon.discountValue), subtotal);
}

async function validateCoupon(executor, code, venueId, subtotal) {
  const coupon = await findCouponByCode(executor, code);

  const invalid = (message) => {
    const err = new Error(message);
    err.status = 400;
    throw err;
  };

  if (!coupon || !coupon.isActive) invalid('کد تخفیف نامعتبر است.');
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) invalid('کد تخفیف منقضی شده است.');
  if (coupon.venueId && coupon.venueId !== venueId) invalid('این کد تخفیف برای این مجموعه معتبر نیست.');
  if (coupon.minOrderAmount && Number(subtotal) < Number(coupon.minOrderAmount)) {
    invalid(`حداقل مبلغ سفارش برای این کد ${Number(coupon.minOrderAmount).toLocaleString('fa-IR')} تومان است.`);
  }
  if (coupon.maxRedemptions != null && coupon.redeemedCount >= coupon.maxRedemptions) {
    invalid('ظرفیت استفاده از این کد تخفیف تکمیل شده است.');
  }

  const discountAmount = computeDiscount(coupon, subtotal);
  return { coupon, discountAmount };
}

async function redeemCouponInTransaction(connection, couponId, orderId, userId) {
  await connection.query('UPDATE `Coupon` SET redeemedCount = redeemedCount + 1 WHERE id = ?', [couponId]);
  await connection.query('INSERT INTO `CouponRedemption` (id, couponId, userId, orderId) VALUES (?, ?, ?, ?)', [
    randomUUID(),
    couponId,
    userId || null,
    orderId,
  ]);
}

// --- Venue-level marketing management ---

async function listVenueCoupons(venueId) {
  const [rows] = await pool.query('SELECT * FROM `Coupon` WHERE venueId = ? ORDER BY createdAt DESC', [venueId]);
  return rows;
}

async function createVenueCoupon(venueId, { code, discountType, discountValue, expiresAt, maxRedemptions, minOrderAmount }) {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO \`Coupon\` (id, venueId, code, discountType, discountValue, expiresAt, maxRedemptions, minOrderAmount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      venueId,
      code.trim().toUpperCase(),
      discountType,
      discountValue,
      expiresAt ? new Date(expiresAt) : null,
      maxRedemptions || null,
      minOrderAmount || null,
    ]
  );
  return findById('Coupon', id);
}

async function updateVenueCoupon(couponId, data) {
  return updateById('Coupon', couponId, data, [
    'discountType',
    'discountValue',
    'expiresAt',
    'maxRedemptions',
    'minOrderAmount',
    'isActive',
  ]);
}

async function deleteVenueCoupon(couponId) {
  return deleteById('Coupon', couponId);
}

async function notifyPromoToPastAndFavoritedCustomers(venueId, venueName, couponCode) {
  const [rows] = await pool.query(
    `SELECT DISTINCT userId FROM (
       SELECT userId FROM \`FavoriteVenue\` WHERE venueId = ?
       UNION
       SELECT customerId AS userId FROM \`Order\` WHERE venueId = ? AND customerId IS NOT NULL
     ) AS recipients`,
    [venueId, venueId]
  );

  for (const row of rows) {
    await createNotification(
      row.userId,
      'PROMO',
      `تخفیف جدید در ${venueName}`,
      `با کد ${couponCode} از تخفیف ویژه این مجموعه استفاده کنید.`,
      { venueId, couponCode }
    );
  }

  return { notifiedCount: rows.length };
}

module.exports = {
  validateCoupon,
  redeemCouponInTransaction,
  listVenueCoupons,
  createVenueCoupon,
  updateVenueCoupon,
  deleteVenueCoupon,
  notifyPromoToPastAndFavoritedCustomers,
};
