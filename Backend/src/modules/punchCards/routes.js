const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole, requireVenueScope } = require('../../middleware/auth');
const { requireVenuePermission } = require('../../middleware/venuePermission');

const router = express.Router({ mergeParams: true });

// Public — anyone viewing the venue's menu can see available bundles.
router.get('/public', controller.listPublic);

// Signed-in customer routes.
router.get('/mine', authenticate, requireRole('CUSTOMER'), controller.listMineForVenue);
router.post('/:planId/purchase', authenticate, requireRole('CUSTOMER'), controller.purchase);

// Venue owner/staff management.
const staffOnly = [
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('venueId'),
  requireVenuePermission('marketing.manage'),
];
router.get('/', ...staffOnly, controller.listForOwner);
router.post('/', ...staffOnly, controller.create);
router.patch('/:id', ...staffOnly, controller.update);

// Separate top-level router (no :venueId in the path) for "all my punch
// cards across every venue" — mounted at /api/punch-cards in app.js.
const mineRouter = express.Router();
mineRouter.get('/mine', authenticate, requireRole('CUSTOMER'), controller.listMine);

module.exports = router;
module.exports.mineRouter = mineRouter;
