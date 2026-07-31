const express = require('express');
const controller = require('./controller');
const { authenticate, optionalAuthenticate, requireRole, requireVenueScope } = require('../../middleware/auth');
const { requireVenuePermission } = require('../../middleware/venuePermission');

const router = express.Router({ mergeParams: true });

// Public (guest-allowed): anyone can request a reservation.
router.post('/', optionalAuthenticate, controller.create);
router.post('/waitlist', optionalAuthenticate, controller.joinWaitlist);

const scoped = [authenticate, requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']), requireVenueScope('venueId')];

router.get('/', ...scoped, requireVenuePermission('orders.view'), controller.list);
router.patch('/:id', ...scoped, requireVenuePermission('orders.manage'), controller.updateStatus);
router.get('/waitlist', ...scoped, requireVenuePermission('orders.view'), controller.listWaitlist);
router.patch('/waitlist/:id', ...scoped, requireVenuePermission('orders.manage'), controller.updateWaitlistStatus);

module.exports = router;
