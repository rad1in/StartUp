const express = require('express');
const router = express.Router({ mergeParams: true });
const c = require('./controller');
const { authenticate, requireRole, requireVenueScope } = require('../../middleware/auth');

const guard = [authenticate, requireRole(['VENUE_OWNER', 'SUPER_ADMIN']), requireVenueScope('venueId')];

router.get('/schedule', ...guard, c.getSchedule);
router.patch('/schedule', ...guard, c.updateSchedule);
router.get('/', ...guard, c.listReports);
router.post('/generate', ...guard, c.generateNow);

module.exports = router;
