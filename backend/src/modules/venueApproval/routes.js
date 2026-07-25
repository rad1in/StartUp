const express = require('express');
const router = express.Router({ mergeParams: true });
const c = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

const guard = [authenticate, requireRole('SUPER_ADMIN')];

router.get('/', ...guard, c.list);
router.patch('/:stageKey', ...guard, c.advance);

module.exports = router;
