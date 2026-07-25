const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { requirePlatformPermission, ADMIN_TEAM_ROLES } = require('../../middleware/platformPermission');

const router = express.Router();

router.use(authenticate, requireRole(ADMIN_TEAM_ROLES), requirePlatformPermission('integrations.manage'));

router.get('/', controller.getStatus);
router.patch('/payment', controller.updatePayment);
router.patch('/sms', controller.updateSms);
router.patch('/email', controller.updateEmail);
router.patch('/captcha', controller.updateCaptcha);
router.patch('/analytics', controller.updateAnalytics);

module.exports = router;
