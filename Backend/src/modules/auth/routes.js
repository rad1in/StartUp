const express = require('express');
const controller = require('./controller');
const { authRateLimiter } = require('../../middleware/rateLimit');
const { authenticate, optionalAuthenticate } = require('../../middleware/auth');
const { requireCaptcha } = require('../../middleware/captcha');
const { findUserById, sanitizeUser } = require('./service');

const router = express.Router();

router.post('/register', authRateLimiter, requireCaptcha, controller.register);
router.post('/login', authRateLimiter, requireCaptcha, controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.post('/change-password', authenticate, controller.changePassword);
router.post('/otp/request', authRateLimiter, requireCaptcha, optionalAuthenticate, controller.requestOtp);
router.post('/otp/verify', authRateLimiter, optionalAuthenticate, controller.verifyOtp);

// Passwordless login/register via phone OTP
router.post('/login/otp/request', authRateLimiter, requireCaptcha, controller.requestLoginOtp);
router.post('/login/otp/verify', authRateLimiter, controller.verifyLoginOtp);

// Google sign-in
router.post('/login/google', authRateLimiter, controller.googleLogin);

// Two-factor login challenge exchange
router.post('/login/2fa', authRateLimiter, controller.verifyLoginTwoFactor);

// Two-factor management (authenticated)
router.post('/2fa/setup', authenticate, controller.setupTwoFactor);
router.post('/2fa/enable', authenticate, controller.enableTwoFactor);
router.post('/2fa/disable', authenticate, controller.disableTwoFactor);

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'کاربر یافت نشد.' });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
