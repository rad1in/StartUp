'use strict';
const { Router } = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const c = require('./controller');

const router = Router();
const adminOnly = [authenticate, requireRole(['SUPER_ADMIN', 'FINANCE_STAFF'])];

router.get('/overview',        ...adminOnly, c.overview);
router.get('/trend',           ...adminOnly, c.trend);
router.get('/by-tier',         ...adminOnly, c.byTier);
router.get('/by-venue',        ...adminOnly, c.byVenue);
router.get('/by-city',         ...adminOnly, c.byCity);
router.get('/cohorts',         ...adminOnly, c.cohorts);
router.get('/venue-activity',  ...adminOnly, c.venueActivity);
router.get('/funnel',          ...adminOnly, c.funnel);
router.get('/drill-down',      ...adminOnly, c.drillDown);
router.get('/export',          ...adminOnly, c.exportCSV);

module.exports = router;
