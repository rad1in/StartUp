const express = require('express');
const controller = require('./controller');
const { authenticate, optionalAuthenticate, requireRole } = require('../../middleware/auth');
const { requireVenuePermission } = require('../../middleware/venuePermission');
const { pool } = require('../../lib/db');

const router = express.Router();

// Order-id routes don't carry venueId in the URL — look the order up and
// compare its venueId against the caller's scope (SUPER_ADMIN bypasses).
function requireOrderVenueMatch() {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'SUPER_ADMIN') return next();
      const [rows] = await pool.query('SELECT venueId FROM `Order` WHERE id = ?', [req.params.id]);
      if (!rows[0] || rows[0].venueId !== req.user.venueId) {
        return res.status(403).json({ message: 'دسترسی به این سفارش مجاز نیست.' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

const venueStaffOnly = [authenticate, requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']), requireOrderVenueMatch()];

// Guest checkout allowed — customerId is attached only if a valid token is present.
router.post('/', optionalAuthenticate, controller.create);

router.get('/mine', authenticate, requireRole('CUSTOMER'), controller.listMine);
router.get('/:id', authenticate, controller.get);
router.get('/:id/receipt.pdf', authenticate, controller.receipt);
router.post('/:id/receipt/sms', authenticate, controller.sendReceiptSms);
router.post('/:id/receipt/email', authenticate, controller.sendReceiptEmail);
router.post('/:id/reorder', authenticate, requireRole('CUSTOMER'), controller.reorder);
router.post('/:id/cancel', authenticate, requireRole('CUSTOMER'), controller.cancelOwnOrder);

router.get(
  '/venue/:venueId',
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  (req, res, next) => {
    if (req.user.role === 'SUPER_ADMIN' || req.user.venueId === req.params.venueId) return next();
    return res.status(403).json({ message: 'دسترسی به این مجموعه برای شما مجاز نیست.' });
  },
  requireVenuePermission('orders.view'),
  controller.listForVenue
);

router.patch('/:id/status', ...venueStaffOnly, requireVenuePermission('orders.manage'), controller.updateStatus);
router.patch('/:id/items', ...venueStaffOnly, requireVenuePermission('orders.manage'), controller.updateItems);
router.patch('/:id/discount', ...venueStaffOnly, requireVenuePermission('orders.manage'), controller.updateDiscount);
router.post('/:id/void', ...venueStaffOnly, requireVenuePermission('orders.manage'), controller.voidOrder);
router.get('/:id/activity', ...venueStaffOnly, requireVenuePermission('orders.view'), controller.activity);

module.exports = router;
