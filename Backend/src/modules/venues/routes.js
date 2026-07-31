const express = require('express');
const controller = require('./controller');
const suggestionsController = require('../suggestions/controller');
const { authenticate, optionalAuthenticate, requireRole, requireVenueScope } = require('../../middleware/auth');
const { requireVenuePermission } = require('../../middleware/venuePermission');
const { venueImageUpload, venueLogoOptimize, venueCoverOptimize } = require('../../lib/upload');

const router = express.Router();

// Public discovery endpoints
router.get('/', controller.list);
router.get('/nearby', controller.nearby);
router.get('/suggestions', optionalAuthenticate, suggestionsController.get);
router.get('/resolve-qr/:token', controller.resolveQr);
router.get('/:id', optionalAuthenticate, controller.get);
router.get('/:id/tables/by-number/:tableNumber', controller.resolveTableByNumber);
router.get('/:id/tables/:tableId/qrcode.png', controller.tableQrCode);

// Venue owner / super admin management
router.post('/', authenticate, requireRole(['VENUE_OWNER', 'SUPER_ADMIN']), controller.create);
// Self-service: a customer registers their own cafe and becomes VENUE_OWNER.
router.post('/register', authenticate, requireRole('CUSTOMER'), controller.registerMyVenue);
router.patch(
  '/:id',
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('id'),
  requireVenuePermission('settings.manage'),
  controller.update
);
router.post(
  '/:id/logo',
  authenticate,
  requireRole(['VENUE_OWNER', 'SUPER_ADMIN']),
  requireVenueScope('id'),
  venueImageUpload.single('image'),
  // Logos are small/square like an avatar, not a wide banner.
  venueLogoOptimize,
  controller.uploadLogo
);
router.post(
  '/:id/cover',
  authenticate,
  requireRole(['VENUE_OWNER', 'SUPER_ADMIN']),
  requireVenueScope('id'),
  venueImageUpload.single('image'),
  venueCoverOptimize,
  controller.uploadCover
);

router.patch(
  '/:id/temporary-closure',
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('id'),
  requireVenuePermission('settings.manage'),
  controller.setTemporaryClosure
);

router.get(
  '/:id/tables',
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('id'),
  requireVenuePermission('tables.view'),
  controller.listTables
);
router.post(
  '/:id/tables',
  authenticate,
  requireRole(['VENUE_OWNER', 'SUPER_ADMIN']),
  requireVenueScope('id'),
  controller.createTable
);
router.patch(
  '/:id/tables/:tableId',
  authenticate,
  requireRole(['VENUE_OWNER', 'SUPER_ADMIN']),
  requireVenueScope('id'),
  controller.updateTable
);
router.delete(
  '/:id/tables/:tableId',
  authenticate,
  requireRole(['VENUE_OWNER', 'SUPER_ADMIN']),
  requireVenueScope('id'),
  controller.deleteTable
);

router.post(
  '/:id/subscription-request',
  authenticate,
  requireRole('VENUE_OWNER'),
  requireVenueScope('id'),
  controller.requestSubscriptionChange
);
router.get(
  '/:id/subscription-requests',
  authenticate,
  requireRole(['VENUE_OWNER', 'SUPER_ADMIN']),
  requireVenueScope('id'),
  controller.listSubscriptionRequests
);

router.get(
  '/:id/activity-log',
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('id'),
  controller.activityLog
);

module.exports = router;
