const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole, requireVenueScope } = require('../../middleware/auth');
const { requireVenuePermission } = require('../../middleware/venuePermission');

const router = express.Router({ mergeParams: true });

const scoped = [
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('venueId'),
  requireVenuePermission('marketing.manage'),
];

router.get('/customers', ...scoped, controller.list);
router.post('/customers/:customerId/coupon', ...scoped, controller.sendCoupon);

module.exports = router;
