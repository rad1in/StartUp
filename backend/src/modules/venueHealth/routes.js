const { Router } = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const c = require('./controller');

const router = Router();
const adminOnly = [authenticate, requireRole(['SUPER_ADMIN', 'SUPPORT_STAFF'])];

router.get('/', ...adminOnly, c.list);
router.get('/:venueId', ...adminOnly, c.forVenue);

module.exports = router;
