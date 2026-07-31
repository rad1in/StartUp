const express = require('express');
const controller = require('./controller');
const { authenticate, optionalAuthenticate, requireRole, requireVenueScope } = require('../../middleware/auth');
const { requireVenuePermission } = require('../../middleware/venuePermission');

const router = express.Router();

router.post('/validate', optionalAuthenticate, controller.validate);

const marketingManage = [
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('venueId'),
  requireVenuePermission('marketing.manage'),
];

router.get('/venue/:venueId', ...marketingManage, controller.listForVenue);
router.post('/venue/:venueId', ...marketingManage, controller.createForVenue);
router.patch('/venue/:venueId/:couponId', ...marketingManage, controller.updateForVenue);
router.delete('/venue/:venueId/:couponId', ...marketingManage, controller.deleteForVenue);
router.post('/venue/:venueId/:couponId/notify', ...marketingManage, controller.notify);

module.exports = router;
