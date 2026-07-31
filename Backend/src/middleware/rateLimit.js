const rateLimit = require('express-rate-limit');
const { config } = require('../config/config');
const { autoBlockIp } = require('./ipBlocklist');

const AUTH_LIMIT_MESSAGE =
  'به دلیل تلاش‌های زیاد و پیاپی، موقتاً امکان ورود/ثبت‌نام برای شما محدود شده است: این یک اقدام امنیتی خودکار برای جلوگیری از حدس زدن رمز عبور است، نه یک خطای واقعی. لطفاً چند دقیقه صبر کنید و دوباره تلاش کنید.';

// Strict limiter for credential endpoints (login/register/OTP) — brute-force guard.
// Window/ceiling are env-tunable (AUTH_RATE_LIMIT_WINDOW_MS/MAX) so ops can
// adjust per-deployment without a code change or redeploy. Repeatedly hitting
// this limit (not just once — a single burst can be a slow connection or a
// user fumbling their password) escalates to a temporary IP block: an actual
// credential-stuffing/brute-force script keeps retrying and gets shut out
// entirely, while a one-off flood is never enough to trip it.
const AUTO_BLOCK_AFTER_HITS = 3;
const AUTO_BLOCK_DURATION_MS = 60 * 60 * 1000;
const rateLimitHitCounts = new Map();
// Bounds the map's lifetime memory use — hit counts only need to reflect
// "repeatedly, within a while," not forever, so periodically starting fresh
// is fine and keeps this from growing unbounded over months of uptime.
setInterval(() => rateLimitHitCounts.clear(), config.rateLimit.authWindowMs * 4).unref();

const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: AUTH_LIMIT_MESSAGE },
  handler: (req, res, next, options) => {
    const hits = (rateLimitHitCounts.get(req.ip) || 0) + 1;
    rateLimitHitCounts.set(req.ip, hits);
    if (hits >= AUTO_BLOCK_AFTER_HITS) {
      rateLimitHitCounts.delete(req.ip);
      autoBlockIp(req.ip, 'تجاوز مکرر از محدودیت نرخ درخواست در مسیرهای احراز هویت', AUTO_BLOCK_DURATION_MS).catch(() => {});
      require('../modules/adminNotifications/service')
        .notifyAdmins({
          type: 'IP_AUTO_BLOCKED',
          title: 'یک آدرس IP به‌طور خودکار مسدود شد',
          body: `IP ${req.ip} پس از تجاوز مکرر از محدودیت نرخ درخواست در مسیرهای ورود/ثبت‌نام، به مدت ۱ ساعت مسدود شد.`,
          severity: 'WARNING',
          link: '/admin/fraud',
        })
        .catch(() => {});
    }
    res.status(options.statusCode).json(options.message);
  },
});

// General API limiter — generous ceiling per IP so normal browsing is never
// throttled but scripted floods / scraping get cut off. Env-tunable via
// RATE_LIMIT_WINDOW_MS/RATE_LIMIT_MAX.
const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      'تعداد درخواست‌های شما در بازه زمانی کوتاه بیش از حد مجاز بوده است: این یک محدودیت خودکار برای جلوگیری از فشار زیاد روی سرور است. لطفاً کمی صبر کنید و دوباره تلاش کنید.',
  },
});

module.exports = { authRateLimiter, apiRateLimiter };
