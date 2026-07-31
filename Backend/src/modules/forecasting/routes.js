const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('./controller');
const { authenticate, requireRole, requireVenueScope } = require('../../middleware/auth');

router.get(
  '/',
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('venueId'),
  controller.getForecast
);

module.exports = router;
