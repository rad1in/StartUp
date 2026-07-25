const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { requirePlatformPermission, ADMIN_TEAM_ROLES } = require('../../middleware/platformPermission');

const router = express.Router();

router.use(authenticate, requireRole(ADMIN_TEAM_ROLES), requirePlatformPermission('venues.manage'));

router.patch('/venues/status', controller.setVenueStatus);
router.patch('/venues/description', controller.findReplaceDescription);
router.patch('/menu/prices', controller.adjustMenuPrices);
router.patch('/menu/availability', controller.setItemAvailability);

module.exports = router;
