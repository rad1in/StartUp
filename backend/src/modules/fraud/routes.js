'use strict';
const { Router } = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const c = require('./controller');

const router = Router();
const staff   = [authenticate, requireRole(['SUPER_ADMIN', 'SUPPORT_STAFF', 'FINANCE_STAFF'])];
const adminOnly = [authenticate, requireRole(['SUPER_ADMIN'])];

router.get('/',                  ...staff,     c.listFlags);
router.get('/summary',           ...staff,     c.summary);
router.get('/thresholds',        ...adminOnly, c.getThresholds);
router.patch('/thresholds',      ...adminOnly, c.updateThresholds);
router.get('/:flagId',           ...staff,     c.getFlag);
router.patch('/:flagId/review',  ...staff,     c.reviewFlag);
router.post('/scan',             ...adminOnly, c.runScan);

module.exports = router;
