const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole, requireVenueScope } = require('../../middleware/auth');
const { requireVenuePermission } = require('../../middleware/venuePermission');

const router = express.Router();

router.get('/venue/:venueId', controller.listForVenue);
router.get('/venue/:venueId/sentiment', controller.sentiment);

router.patch(
  '/venue/:venueId/:id/reply',
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('venueId'),
  requireVenuePermission('feedback.manage'),
  controller.reply
);

router.use(authenticate, requireRole('CUSTOMER'));
router.get('/mine', controller.listMine);
router.post('/', controller.create);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
