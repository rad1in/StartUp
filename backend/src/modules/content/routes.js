const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { requirePlatformPermission, ADMIN_TEAM_ROLES } = require('../../middleware/platformPermission');

const publicRouter = express.Router();
publicRouter.get('/faq', controller.listFaqPublic);
publicRouter.get('/banners', controller.listBannersPublic);
publicRouter.get('/settings/discovery', controller.getDiscoverySettingsPublic);
publicRouter.get('/feature-flags', controller.getFeatureFlagsPublic);

const adminRouter = express.Router();
adminRouter.use(authenticate, requireRole(ADMIN_TEAM_ROLES), requirePlatformPermission('content.manage'));
adminRouter.get('/faq', controller.listFaqAdmin);
adminRouter.post('/faq', controller.createFaq);
adminRouter.patch('/faq/:id', controller.updateFaq);
adminRouter.delete('/faq/:id', controller.deleteFaq);
adminRouter.get('/banners', controller.listBannersAdmin);
adminRouter.post('/banners', controller.createBanner);
adminRouter.patch('/banners/:id', controller.updateBanner);
adminRouter.delete('/banners/:id', controller.deleteBanner);
adminRouter.get('/settings', controller.getDiscoverySettingsAdmin);
adminRouter.patch('/settings', controller.updateDiscoverySettings);

// Toggling a platform-wide feature (e.g. disabling Google login for everyone)
// is a bigger blast radius than routine content edits — restrict to the
// platform owner even though the rest of this router allows content.manage.
adminRouter.get('/feature-flags', requireRole('SUPER_ADMIN'), controller.getFeatureFlagsAdmin);
adminRouter.patch('/feature-flags', requireRole('SUPER_ADMIN'), controller.updateFeatureFlags);

module.exports = { publicRouter, adminRouter };
