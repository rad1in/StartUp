const express = require('express');
const router = express.Router({ mergeParams: true });
const c = require('./controller');
const { authenticate, requireRole, requireVenueScope } = require('../../middleware/auth');

const guard = [authenticate, requireRole(['VENUE_OWNER', 'SUPER_ADMIN']), requireVenueScope('venueId')];

router.get('/', ...guard, c.list);
router.post('/', ...guard, c.create);
router.patch('/:webhookId', ...guard, c.toggle);
router.delete('/:webhookId', ...guard, c.remove);
router.post('/:webhookId/test', ...guard, c.test);

module.exports = router;
