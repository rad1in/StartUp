const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate, requireRole, requirePlatformPermission } = require('../../middleware/auth');

// Customer: GET /api/gamification/me
router.get('/me', authenticate, requireRole(['CUSTOMER']), controller.me);

// Admin: tier + badge CRUD
router.get('/tiers', authenticate, requirePlatformPermission('platform.admin'), controller.listTiers);
router.post('/tiers', authenticate, requirePlatformPermission('platform.admin'), controller.createTier);
router.patch('/tiers/:tierId', authenticate, requirePlatformPermission('platform.admin'), controller.updateTier);
router.delete('/tiers/:tierId', authenticate, requirePlatformPermission('platform.admin'), controller.deleteTier);

router.get('/badges', authenticate, requirePlatformPermission('platform.admin'), controller.listBadges);
router.post('/badges', authenticate, requirePlatformPermission('platform.admin'), controller.createBadge);
router.patch('/badges/:badgeId', authenticate, requirePlatformPermission('platform.admin'), controller.updateBadge);
router.delete('/badges/:badgeId', authenticate, requirePlatformPermission('platform.admin'), controller.deleteBadge);

module.exports = router;
