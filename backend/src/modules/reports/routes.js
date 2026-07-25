const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { requirePlatformPermission, ADMIN_TEAM_ROLES } = require('../../middleware/platformPermission');

const router = express.Router();

router.use(authenticate, requireRole(ADMIN_TEAM_ROLES), requirePlatformPermission('reports.view'));

router.get('/revenue-by-venue', controller.revenueByVenue);
router.get('/revenue-by-region', controller.revenueByRegion);
router.get('/commission-by-tier', controller.commissionByTier);
router.get('/top-venues', controller.topVenues);
router.get('/retention', controller.retention);
router.get('/fraud-flags', controller.fraudFlags);
router.get('/reconciliation', controller.reconciliation);
router.get('/refund-overview', controller.refundOverview);

module.exports = router;
