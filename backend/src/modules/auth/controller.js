const service = require('./service');
const { config } = require('../../config/config');

const REFRESH_COOKIE = 'refreshToken';
const cookieOptions = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax',
  maxAge: config.jwt.refreshExpiresInMs,
  path: '/api/auth',
};

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, cookieOptions);
}

function requestMeta(req) {
  return { userAgent: req.headers['user-agent'] || null, ip: req.ip };
}

// Normalize the two shapes a login flow can return: a 2FA challenge (no tokens
// yet) or a full token set. Keeps the refresh token in an httpOnly cookie.
function sendAuthResult(res, result, status = 200) {
  if (result.twoFactorRequired) {
    return res.status(status).json({
      twoFactorRequired: true,
      challengeToken: result.challengeToken,
      user: result.user,
    });
  }
  setRefreshCookie(res, result.refreshToken);
  return res.status(status).json({ accessToken: result.accessToken, user: result.user });
}

async function register(req, res, next) {
  try {
    const { email, password, name, phone, referralCode } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'ایمیل، رمز عبور و نام الزامی است.' });
    }
    const { accessToken, refreshToken, user } = await service.register({ email, password, name, phone, referralCode });
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ accessToken, user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'ایمیل و رمز عبور الزامی است.' });
    }
    const result = await service.login({ email, password }, requestMeta(req));
    sendAuthResult(res, result);
  } catch (err) {
    next(err);
  }
}

async function requestLoginOtp(req, res, next) {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'شماره موبایل الزامی است.' });
    res.json(await service.requestLoginOtp(phone));
  } catch (err) {
    next(err);
  }
}

async function verifyLoginOtp(req, res, next) {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ message: 'شماره موبایل و کد تایید الزامی است.' });
    const result = await service.verifyLoginOtp(phone, code, requestMeta(req));
    sendAuthResult(res, result);
  } catch (err) {
    next(err);
  }
}

async function verifyLoginTwoFactor(req, res, next) {
  try {
    const { challengeToken, code } = req.body;
    if (!challengeToken || !code) return res.status(400).json({ message: 'کد تایید الزامی است.' });
    const result = await service.verifyLoginTwoFactor(challengeToken, code, requestMeta(req));
    sendAuthResult(res, result);
  } catch (err) {
    next(err);
  }
}

async function googleLogin(req, res, next) {
  try {
    const { idToken } = req.body;
    const result = await service.googleLogin(idToken, requestMeta(req));
    sendAuthResult(res, result);
  } catch (err) {
    next(err);
  }
}

async function setupTwoFactor(req, res, next) {
  try {
    res.json(await service.beginTwoFactorSetup(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function enableTwoFactor(req, res, next) {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'کد تایید الزامی است.' });
    res.json(await service.enableTwoFactor(req.user.id, code));
  } catch (err) {
    next(err);
  }
}

async function disableTwoFactor(req, res, next) {
  try {
    res.json(await service.disableTwoFactor(req.user.id, req.body.code));
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    const { accessToken, refreshToken, user } = await service.refresh(token, requestMeta(req));
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    await service.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'رمز عبور فعلی و جدید الزامی است.' });
    }
    await service.changePassword(req.user.id, currentPassword, newPassword);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function requestOtp(req, res, next) {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'شماره موبایل الزامی است.' });
    const result = await service.requestOtp(phone, req.user?.id || null);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ message: 'شماره موبایل و کد تایید الزامی است.' });
    const result = await service.verifyOtp(phone, code, req.user?.id || null);
    res.json(result);
  } catch (err) {
    next(err);
  }
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
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
};
