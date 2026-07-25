const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, updateById } = require('../../lib/sqlHelpers');
const { sanitizeUser } = require('../auth/service');
const { avatarUrlFor, coverImageUrlFor } = require('../../lib/upload');

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

async function getProfile(userId) {
  const user = await findById('User', userId);
  return sanitizeUser(user);
}

async function updateProfile(
  userId,
  { name, phone, avatarUrl, username, bio, isProfilePublic, smsMarketingOptOut, emailMarketingOptOut }
) {
  if (username !== undefined && username !== null && username !== '') {
    if (!USERNAME_PATTERN.test(username)) {
      const err = new Error('نام کاربری باید ۳ تا ۳۰ حرف انگلیسی کوچک، عدد یا _ باشد.');
      err.status = 400;
      throw err;
    }
  }
  try {
    const user = await updateById(
      'User',
      userId,
      { name, phone, avatarUrl, username: username === '' ? null : username, bio, isProfilePublic, smsMarketingOptOut, emailMarketingOptOut },
      ['name', 'phone', 'avatarUrl', 'username', 'bio', 'isProfilePublic', 'smsMarketingOptOut', 'emailMarketingOptOut']
    );
    return sanitizeUser(user);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const dupErr = new Error('این نام کاربری قبلاً انتخاب شده است.');
      dupErr.status = 409;
      throw dupErr;
    }
    throw err;
  }
}

async function setAvatar(userId, filename) {
  const avatarUrl = avatarUrlFor(filename);
  const user = await updateById('User', userId, { avatarUrl }, ['avatarUrl']);
  return sanitizeUser(user);
}

async function setCoverImage(userId, filename) {
  const coverImageUrl = coverImageUrlFor(filename);
  const user = await updateById('User', userId, { coverImageUrl }, ['coverImageUrl']);
  return sanitizeUser(user);
}

async function listAvailableCoupons() {
  const [rows] = await pool.query(
    `SELECT * FROM \`Coupon\`
     WHERE isActive = TRUE AND (expiresAt IS NULL OR expiresAt >= NOW())
       AND (maxRedemptions IS NULL OR redeemedCount < maxRedemptions)
     ORDER BY createdAt DESC`
  );
  return rows;
}

async function listSessions(userId) {
  const [rows] = await pool.query(
    `SELECT id, userAgent, ip, lastUsedAt, createdAt, expiresAt FROM \`RefreshToken\`
     WHERE userId = ? AND revoked = FALSE AND expiresAt > NOW()
     ORDER BY lastUsedAt DESC`,
    [userId]
  );
  return rows;
}

async function revokeSession(userId, sessionId) {
  await pool.query('UPDATE `RefreshToken` SET revoked = TRUE WHERE id = ? AND userId = ?', [sessionId, userId]);
}

async function deleteAccount(userId) {
  const anonymizedEmail = `deleted-${randomUUID()}@deleted.local`;
  await pool.query(
    `UPDATE \`User\` SET email = ?, name = 'کاربر حذف‌شده', phone = NULL, avatarUrl = NULL, deletedAt = NOW()
     WHERE id = ?`,
    [anonymizedEmail, userId]
  );
  await pool.query('UPDATE `RefreshToken` SET revoked = TRUE WHERE userId = ?', [userId]);
}

module.exports = {
  getProfile,
  updateProfile,
  setAvatar,
  setCoverImage,
  listAvailableCoupons,
  listSessions,
  revokeSession,
  deleteAccount,
};
