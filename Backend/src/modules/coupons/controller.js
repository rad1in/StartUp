const { pool } = require('../../lib/db');
const { findById } = require('../../lib/sqlHelpers');
const service = require('./service');
const { logActivity } = require('../../lib/activityLog');

async function validate(req, res, next) {
  try {
    const { code, venueId, subtotal } = req.body;
    if (!code || !venueId || subtotal == null) {
      return res.status(400).json({ message: 'کد تخفیف، شناسه مجموعه و مبلغ سفارش الزامی است.' });
    }
    const { coupon, discountAmount } = await service.validateCoupon(pool, code.trim().toUpperCase(), venueId, subtotal);
    res.json({
      valid: true,
      discountAmount,
      coupon: { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue },
    });
  } catch (err) {
    next(err);
  }
}

async function listForVenue(req, res, next) {
  try {
    res.json(await service.listVenueCoupons(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function createForVenue(req, res, next) {
  try {
    const { code, discountType, discountValue } = req.body;
    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ message: 'کد، نوع و مقدار تخفیف الزامی است.' });
    }
    const coupon = await service.createVenueCoupon(req.params.venueId, req.body);
    await logActivity(req.params.venueId, req.user.id, 'COUPON_CREATED', 'Coupon', coupon.id, req.body);
    res.status(201).json(coupon);
  } catch (err) {
    next(err);
  }
}

async function updateForVenue(req, res, next) {
  try {
    const coupon = await service.updateVenueCoupon(req.params.couponId, req.body);
    await logActivity(req.params.venueId, req.user.id, 'COUPON_UPDATED', 'Coupon', req.params.couponId, req.body);
    res.json(coupon);
  } catch (err) {
    next(err);
  }
}

async function deleteForVenue(req, res, next) {
  try {
    await service.deleteVenueCoupon(req.params.couponId);
    await logActivity(req.params.venueId, req.user.id, 'COUPON_DELETED', 'Coupon', req.params.couponId, null);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function notify(req, res, next) {
  try {
    const coupon = await findById('Coupon', req.params.couponId);
    if (!coupon || coupon.venueId !== req.params.venueId) {
      return res.status(404).json({ message: 'کد تخفیف یافت نشد.' });
    }
    const venue = await findById('Venue', req.params.venueId);
    const result = await service.notifyPromoToPastAndFavoritedCustomers(req.params.venueId, venue.name, coupon.code);
    await logActivity(req.params.venueId, req.user.id, 'PROMO_NOTIFICATION_SENT', 'Coupon', coupon.id, result);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { validate, listForVenue, createForVenue, updateForVenue, deleteForVenue, notify };
