const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole, requireVenueScope } = require('../../middleware/auth');
const { requireVenuePermission } = require('../../middleware/venuePermission');

const router = express.Router({ mergeParams: true });

const staffOnly = [authenticate, requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']), requireVenueScope('venueId')];
const shiftManage = [...staffOnly, requireVenuePermission('staff.manage')];

router.get('/', ...staffOnly, controller.list);
router.post('/', ...shiftManage, controller.create);
router.patch('/:shiftId', ...shiftManage, controller.update);
router.delete('/:shiftId', ...shiftManage, controller.remove);

router.post('/:shiftId/clock-in', ...staffOnly, controller.clockIn);
router.post('/:shiftId/clock-out', ...staffOnly, controller.clockOut);

module.exports = router;
