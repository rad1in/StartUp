const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole, requireVenueScope } = require('../../middleware/auth');
const { requireVenuePermission } = require('../../middleware/venuePermission');

const router = express.Router();

// Guests (no login required) can call a waiter from the table's menu page.
router.post('/', controller.create);

router.get(
  '/venue/:venueId',
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('venueId'),
  requireVenuePermission('orders.view'),
  controller.listForVenue
);

router.patch(
  '/venue/:venueId/:id/resolve',
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('venueId'),
  requireVenuePermission('orders.manage'),
  controller.resolve
);

module.exports = router;
