const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get('/', requireRole(['CUSTOMER', 'VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']), controller.listShares);
router.post('/', requireRole(['CUSTOMER', 'VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']), controller.createSplit);

module.exports = router;
