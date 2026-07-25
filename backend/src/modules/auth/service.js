const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const https = require('https');
const jwt = require('jsonwebtoken');
const { randomUUID, randomInt } = require('crypto');
const { pool } = require('../../lib/db');
const { config } = require('../../config/config');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../lib/jwt');
const {
  generateSecret: generateTotpSecret,
  verifyToken: verifyTotp,
  otpauthUrl: totpOtpauthUrl,
} = require('../../lib/totp');
const { getSmsProvider } = require('../../sms');
const { getFeatureFlags } = require('../content/service');

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashOtp(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM `User` WHERE email = ? AND deletedAt IS NULL', [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  const [rows] = await pool.query('SELECT * FROM `User` WHERE id = ? AND deletedAt IS NULL', [id]);
  return rows[0] || null;
}

async function register({ email, password, name, phone, referralCode }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    const err = new Error('این ایمیل قبلاً ثبت‌نام کرده است.');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `User` (id, email, passwordHash, name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
    [id, email, passwordHash, name, phone || null, 'CUSTOMER']
  );

  if (referralCode) {
    require('../referral/service').registerReferral(id, referralCode).catch(() => {});
  }

  const user = await findUserById(id);
  return issueTokens(user);
}

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

async function login({ email, password }, meta = {}) {
  const user = await findUserByEmail(email);
  if (!user) {
    const err = new Error('ایمیل یا رمز عبور اشتباه است.');
    err.status = 401;
    throw err;
  }

  // Account-level lockout — on top of the IP-based rate limiter on the route,
  // this stops a distributed brute force (many IPs, one target account) that
  // an IP limiter alone can't see.
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
    const err = new Error(`به دلیل تلاش‌های ناموفق زیاد، این حساب موقتاً قفل شده است. ${minutesLeft} دقیقه دیگر دوباره تلاش کنید.`);
    err.status = 429;
    throw err;
  }

  if (!user.passwordHash) {
    const err = new Error('این حساب با رمز عبور ساخته نشده است. با کد پیامکی یا گوگل وارد شوید.');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil = attempts >= LOCKOUT_THRESHOLD ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;
    await pool.query('UPDATE `User` SET failedLoginAttempts = ?, lockedUntil = ? WHERE id = ?', [
      attempts,
      lockedUntil,
      user.id,
    ]);
    if (lockedUntil) {
      const err = new Error('به دلیل تلاش‌های ناموفق زیاد، این حساب به مدت ۱۵ دقیقه قفل شد.');
      err.status = 429;
      throw err;
    }
    const err = new Error('ایمیل یا رمز عبور اشتباه است.');
    err.status = 401;
    throw err;
  }

  if (user.isSuspended) {
    const err = new Error('حساب کاربری شما مسدود شده است. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.');
    err.status = 403;
    throw err;
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await pool.query('UPDATE `User` SET failedLoginAttempts = 0, lockedUntil = NULL WHERE id = ?', [user.id]);
  }

  return finalizeLogin(user, meta);
}

// Gate token issuance behind 2FA when the user has enabled it: instead of tokens,
// hand back a short-lived challenge the client exchanges for tokens after the
// user enters their authenticator code.
async function finalizeLogin(user, meta = {}) {
  if (user.twoFactorEnabled) {
    const challengeToken = jwt.sign({ sub: user.id, purpose: '2fa' }, config.jwt.secret, { expiresIn: '5m' });
    return { twoFactorRequired: true, challengeToken, user: { name: user.name } };
  }
  return issueTokens(user, meta);
}

async function verifyLoginTwoFactor(challengeToken, code, meta = {}) {
  let payload;
  try {
    payload = jwt.verify(challengeToken, config.jwt.secret);
  } catch {
    const err = new Error('نشست تایید دو مرحله‌ای منقضی شده است. دوباره وارد شوید.');
    err.status = 401;
    throw err;
  }
  if (payload.purpose !== '2fa') {
    const err = new Error('توکن نامعتبر است.');
    err.status = 401;
    throw err;
  }
  const user = await findUserById(payload.sub);
  if (!user || !user.twoFactorEnabled) {
    const err = new Error('کاربر یافت نشد.');
    err.status = 401;
    throw err;
  }
  if (!verifyTotp(user.twoFactorSecret, code)) {
    const err = new Error('کد تایید دو مرحله‌ای اشتباه است.');
    err.status = 401;
    throw err;
  }
  return issueTokens(user, meta);
}

// --- Google Sign-In ---
// Verifies the Google ID token via Google's tokeninfo endpoint, then finds or
// provisions a customer account keyed by the verified email.
async function googleLogin(idToken, meta = {}) {
  const flags = await getFeatureFlags();
  if (!flags.googleLogin) {
    const err = new Error('ورود با گوگل موقتاً غیرفعال است.');
    err.status = 403;
    throw err;
  }
  if (!idToken) {
    const err = new Error('توکن گوگل ارسال نشده است.');
    err.status = 400;
    throw err;
  }
  const info = await new Promise((resolve, reject) => {
    https
      .get(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ statusCode: res.statusCode, body: {} });
          }
        });
      })
      .on('error', reject);
  });

  const claims = info.body || {};
  if (info.statusCode !== 200 || !claims.email) {
    const err = new Error('توکن گوگل نامعتبر است.');
    err.status = 401;
    throw err;
  }
  if (config.googleClientId && claims.aud !== config.googleClientId) {
    const err = new Error('توکن گوگل برای این برنامه صادر نشده است.');
    err.status = 401;
    throw err;
  }
  if (claims.email_verified === 'false' || claims.email_verified === false) {
    const err = new Error('ایمیل گوگل تایید نشده است.');
    err.status = 401;
    throw err;
  }

  let user = await findUserByEmail(claims.email);
  if (user && user.isSuspended) {
    const err = new Error('حساب کاربری شما مسدود شده است.');
    err.status = 403;
    throw err;
  }
  if (!user) {
    const id = randomUUID();
    await pool.query(
      'INSERT INTO `User` (id, email, passwordHash, name, role) VALUES (?, ?, NULL, ?, ?)',
      [id, claims.email, claims.name || claims.email.split('@')[0], 'CUSTOMER']
    );
    user = await findUserById(id);
  }
  return finalizeLogin(user, meta);
}

// --- Two-factor (TOTP) management ---

async function beginTwoFactorSetup(userId) {
  const user = await findUserById(userId);
  if (!user) {
    const err = new Error('کاربر یافت نشد.');
    err.status = 404;
    throw err;
  }
  if (user.twoFactorEnabled) {
    const err = new Error('احراز هویت دو مرحله‌ای از قبل فعال است.');
    err.status = 400;
    throw err;
  }
  // Store the pending secret; it only becomes active once a code is verified.
  const secret = generateTotpSecret();
  await pool.query('UPDATE `User` SET twoFactorSecret = ? WHERE id = ?', [secret, userId]);
  return { secret, otpauthUrl: totpOtpauthUrl(secret, user.email || user.phone || user.name) };
}

async function enableTwoFactor(userId, code) {
  const user = await findUserById(userId);
  if (!user || !user.twoFactorSecret) {
    const err = new Error('ابتدا مرحله راه‌اندازی را انجام دهید.');
    err.status = 400;
    throw err;
  }
  if (!verifyTotp(user.twoFactorSecret, code)) {
    const err = new Error('کد وارد شده صحیح نیست.');
    err.status = 400;
    throw err;
  }
  await pool.query('UPDATE `User` SET twoFactorEnabled = TRUE WHERE id = ?', [userId]);
  return { enabled: true };
}

async function disableTwoFactor(userId, code) {
  const user = await findUserById(userId);
  if (!user) {
    const err = new Error('کاربر یافت نشد.');
    err.status = 404;
    throw err;
  }
  if (user.twoFactorEnabled && !verifyTotp(user.twoFactorSecret, code)) {
    const err = new Error('برای غیرفعال کردن، کد تایید فعلی را وارد کنید.');
    err.status = 400;
    throw err;
  }
  await pool.query('UPDATE `User` SET twoFactorEnabled = FALSE, twoFactorSecret = NULL WHERE id = ?', [userId]);
  return { enabled: false };
}

async function issueTokens(user, meta = {}) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const now = new Date();

  await pool.query(
    `INSERT INTO \`RefreshToken\` (id, userId, tokenHash, expiresAt, userAgent, ip, lastUsedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      user.id,
      hashToken(refreshToken),
      new Date(Date.now() + config.jwt.refreshExpiresInMs),
      meta.userAgent || null,
      meta.ip || null,
      now,
    ]
  );

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
}

async function refresh(refreshToken, meta = {}) {
  if (!refreshToken) {
    const err = new Error('توکن تازه‌سازی ارسال نشده است.');
    err.status = 401;
    throw err;
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (e) {
    const err = new Error('توکن تازه‌سازی نامعتبر است.');
    err.status = 401;
    throw err;
  }

  const tokenHash = hashToken(refreshToken);
  const [rows] = await pool.query(
    'SELECT * FROM `RefreshToken` WHERE userId = ? AND tokenHash = ? AND revoked = FALSE',
    [payload.sub, tokenHash]
  );
  const stored = rows[0];

  if (!stored || new Date(stored.expiresAt) < new Date()) {
    const err = new Error('توکن تازه‌سازی نامعتبر یا منقضی شده است.');
    err.status = 401;
    throw err;
  }

  const user = await findUserById(payload.sub);
  if (!user) {
    const err = new Error('کاربر یافت نشد.');
    err.status = 401;
    throw err;
  }
  if (user.isSuspended) {
    const err = new Error('حساب کاربری شما مسدود شده است.');
    err.status = 403;
    throw err;
  }

  await pool.query('UPDATE `RefreshToken` SET revoked = TRUE, lastUsedAt = NOW() WHERE id = ?', [stored.id]);

  return issueTokens(user, meta);
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  const tokenHash = hashToken(refreshToken);
  await pool.query('UPDATE `RefreshToken` SET revoked = TRUE WHERE tokenHash = ?', [tokenHash]);
}

async function changePassword(userId, currentPassword, newPassword) {
  const [rows] = await pool.query('SELECT * FROM `User` WHERE id = ?', [userId]);
  const user = rows[0];
  if (!user) {
    const err = new Error('کاربر یافت نشد.');
    err.status = 404;
    throw err;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    const err = new Error('رمز عبور فعلی صحیح نیست.');
    err.status = 401;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE `User` SET passwordHash = ? WHERE id = ?', [passwordHash, userId]);
}

async function requestOtp(phone, userId = null) {
  return sendOtpForPurpose(phone, 'PHONE_VERIFY', userId);
}

// Shared OTP dispatch: the provider sends & owns the code, we persist its hash.
async function sendOtpForPurpose(phone, purpose, userId = null) {
  const provider = await getSmsProvider();
  const { code } = await provider.sendOtp(phone);

  await pool.query(
    'INSERT INTO `OtpCode` (id, userId, phone, codeHash, purpose, expiresAt) VALUES (?, ?, ?, ?, ?, ?)',
    [randomUUID(), userId, phone, hashOtp(code), purpose, new Date(Date.now() + OTP_TTL_MS)]
  );

  return { sent: true };
}

function normalizePhone(phone) {
  const p = String(phone || '').trim().replace(/\s+/g, '');
  if (!/^09\d{9}$/.test(p)) {
    const err = new Error('شماره موبایل معتبر نیست. نمونه صحیح: 09123456789');
    err.status = 400;
    throw err;
  }
  return p;
}

// --- Passwordless login/register via phone OTP ---

async function requestLoginOtp(phone) {
  const flags = await getFeatureFlags();
  if (!flags.otpLogin) {
    const err = new Error('ورود با کد پیامکی موقتاً غیرفعال است.');
    err.status = 403;
    throw err;
  }
  const normalized = normalizePhone(phone);
  return sendOtpForPurpose(normalized, 'LOGIN');
}

async function verifyLoginOtp(phone, code, meta = {}) {
  const normalized = normalizePhone(phone);
  const [rows] = await pool.query(
    `SELECT * FROM \`OtpCode\` WHERE phone = ? AND purpose = 'LOGIN' AND consumedAt IS NULL
     ORDER BY createdAt DESC LIMIT 1`,
    [normalized]
  );
  const otp = rows[0];
  if (!otp || new Date(otp.expiresAt) < new Date()) {
    const err = new Error('کد تایید نامعتبر یا منقضی شده است.');
    err.status = 400;
    throw err;
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    const err = new Error('تعداد تلاش‌های مجاز به پایان رسیده است. کد جدید درخواست کنید.');
    err.status = 429;
    throw err;
  }
  if (hashOtp(String(code)) !== otp.codeHash) {
    await pool.query('UPDATE `OtpCode` SET attempts = attempts + 1 WHERE id = ?', [otp.id]);
    const err = new Error('کد تایید اشتباه است.');
    err.status = 400;
    throw err;
  }
  await pool.query('UPDATE `OtpCode` SET consumedAt = NOW() WHERE id = ?', [otp.id]);

  // Find an existing customer by phone, or provision a new account on the fly.
  const [existingRows] = await pool.query(
    "SELECT * FROM `User` WHERE phone = ? AND deletedAt IS NULL ORDER BY createdAt ASC LIMIT 1",
    [normalized]
  );
  let user = existingRows[0];
  if (user && user.isSuspended) {
    const err = new Error('حساب کاربری شما مسدود شده است.');
    err.status = 403;
    throw err;
  }
  if (!user) {
    const id = randomUUID();
    // Placeholder email + no password: this account signs in by OTP (or Google)
    // until the user optionally sets a password later.
    const placeholderEmail = `phone_${normalized}@otp.et-cafe.local`;
    await pool.query(
      'INSERT INTO `User` (id, email, passwordHash, name, phone, role, phoneVerifiedAt) VALUES (?, ?, NULL, ?, ?, ?, NOW())',
      [id, placeholderEmail, `کاربر ${normalized.slice(-4)}`, normalized, 'CUSTOMER']
    );
    user = await findUserById(id);
  } else if (!user.phoneVerifiedAt) {
    await pool.query('UPDATE `User` SET phoneVerifiedAt = NOW() WHERE id = ?', [user.id]);
  }

  return finalizeLogin(user, meta);
}

async function verifyOtp(phone, code, userId = null) {
  const [rows] = await pool.query(
    `SELECT * FROM \`OtpCode\` WHERE phone = ? AND purpose = 'PHONE_VERIFY' AND consumedAt IS NULL
     ORDER BY createdAt DESC LIMIT 1`,
    [phone]
  );
  const otp = rows[0];

  if (!otp || new Date(otp.expiresAt) < new Date()) {
    const err = new Error('کد تایید نامعتبر یا منقضی شده است.');
    err.status = 400;
    throw err;
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    const err = new Error('تعداد تلاش‌های مجاز به پایان رسیده است. کد جدید درخواست کنید.');
    err.status = 429;
    throw err;
  }

  if (hashOtp(code) !== otp.codeHash) {
    await pool.query('UPDATE `OtpCode` SET attempts = attempts + 1 WHERE id = ?', [otp.id]);
    const err = new Error('کد تایید اشتباه است.');
    err.status = 400;
    throw err;
  }

  await pool.query('UPDATE `OtpCode` SET consumedAt = NOW() WHERE id = ?', [otp.id]);

  if (userId) {
    await pool.query('UPDATE `User` SET phone = ?, phoneVerifiedAt = NOW() WHERE id = ?', [phone, userId]);
  }

  return { verified: true };
}

function sanitizeUser(user) {
  if (!user) return null;
  // Never expose secrets; surface a boolean the client can use to render 2FA/
  // password state without leaking the actual hash or TOTP seed.
  const { passwordHash, twoFactorSecret, ...rest } = user;
  return {
    ...rest,
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    hasPassword: Boolean(passwordHash),
  };
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  changePassword,
  requestOtp,
  verifyOtp,
  requestLoginOtp,
  verifyLoginOtp,
  verifyLoginTwoFactor,
  googleLogin,
  beginTwoFactorSetup,
  enableTwoFactor,
  disableTwoFactor,
  sanitizeUser,
  findUserById,
  findUserByEmail,
};
