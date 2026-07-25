const { getSetting } = require('../lib/platformSettings');
const { verifyToken } = require('../lib/hcaptcha');

// Admin-toggleable, same on/off + "not configured yet" pattern used by the
// payment/SMS/email providers — disabled by default so a fresh deployment
// never locks anyone out of auth before an admin sets it up.
async function requireCaptcha(req, res, next) {
  try {
    const enabled = await getSetting('captcha.enabled', false);
    if (!enabled) return next();

    const secretKey = await getSetting('captcha.hcaptcha.secretKey', '');
    if (!secretKey) {
      return res.status(503).json({ message: 'سیستم کپچا فعال است اما هنوز پیکربندی نشده است.' });
    }

    const token = req.body.captchaToken;
    if (!token) {
      return res.status(400).json({ message: 'لطفاً کپچا را تکمیل کنید.' });
    }

    const ok = await verifyToken(secretKey, token, req.ip);
    if (!ok) {
      return res.status(400).json({ message: 'تایید کپچا ناموفق بود. دوباره تلاش کنید.' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireCaptcha };
