const express = require('express');
const router = express.Router({ mergeParams: true });
const c = require('./controller');
const { authenticate, requireRole, requireVenueScope } = require('../../middleware/auth');

const guard = [authenticate, requireRole(['VENUE_OWNER', 'SUPER_ADMIN']), requireVenueScope('venueId')];

router.get('/config', ...guard, c.getConfig);
router.patch('/config', ...guard, c.updateConfig);
router.get('/log', ...guard, c.listLog);
router.post('/run', ...guard, c.runNow);

module.exports = router;
