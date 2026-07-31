const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { avatarUpload, avatarOptimize, coverImageUpload, coverImageOptimize } = require('../../lib/upload');
const ordersController = require('../orders/controller');

const router = express.Router();

router.use(authenticate);

// Universal account endpoints — every role (owner, staff, admin) has a
// profile, an avatar and login sessions, not just customers.
router.get('/profile', controller.getProfile);
router.patch('/profile', controller.updateProfile);
router.post('/avatar', avatarUpload.single('avatar'), avatarOptimize, controller.uploadAvatar);
router.post('/cover', coverImageUpload.single('cover'), coverImageOptimize, controller.uploadCoverImage);
router.get('/sessions', controller.listSessions);
router.delete('/sessions/:sessionId', controller.revokeSession);

// Customer-only from here down (orders, coupons, account removal).
router.use(requireRole('CUSTOMER'));

router.get('/orders', ordersController.listMine);
router.get('/coupons', controller.listCoupons);

router.delete('/account', controller.deleteAccount);

module.exports = router;
