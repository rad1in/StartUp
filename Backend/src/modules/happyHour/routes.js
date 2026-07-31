const express = require('express');
const controller = require('./controller');
const { authenticate, optionalAuthenticate, requireRole, requireVenueScope } = require('../../middleware/auth');
const { requireVenuePermission } = require('../../middleware/venuePermission');

const router = express.Router({ mergeParams: true });

// Public: the customer menu page checks whether happy hour is active right now.
router.get('/active', optionalAuthenticate, controller.active);

const manage = [
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('venueId'),
  requireVenuePermission('marketing.manage'),
];

router.get('/', ...manage, controller.list);
router.post('/', ...manage, controller.create);
router.patch('/:ruleId', ...manage, controller.update);
router.delete('/:ruleId', ...manage, controller.remove);

module.exports = router;
