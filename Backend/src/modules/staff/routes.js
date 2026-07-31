const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole, requireVenueScope } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });

router.get('/permissions-catalogue', controller.catalogue);

router.get(
  '/me/permissions',
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('venueId'),
  controller.myPermissions
);

router.use(authenticate, requireRole('VENUE_OWNER'), requireVenueScope('venueId'));

router.get('/', controller.list);
router.post('/', controller.create);
router.patch('/:userId/permissions', controller.updatePermissions);
router.delete('/:userId', controller.remove);

module.exports = router;
