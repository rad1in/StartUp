const rateLimit = require('express-rate-limit');
const { config } = require('../config/config');

// Strict limiter for credential endpoints (login/register/OTP) — brute-force guard.
// Window/ceiling are env-tunable (AUTH_RATE_LIMIT_WINDOW_MS/MAX) so ops can
// adjust per-deployment without a code change or redeploy.
const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      'به دلیل تلاش‌های زیاد و پیاپی، موقتاً امکان ورود/ثبت‌نام برای شما محدود شده است: این یک اقدام امنیتی خودکار برای جلوگیری از حدس زدن رمز عبور است، نه یک خطای واقعی. لطفاً چند دقیقه صبر کنید و دوباره تلاش کنید.',
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
