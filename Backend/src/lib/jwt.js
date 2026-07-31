const jwt = require('jsonwebtoken');
const { config } = require('../config/config');

function signAccessToken(user, { impersonatedBy } = {}) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      venueId: user.venueId || null,
      ...(impersonatedBy ? { impersonatedBy } : {}),
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
