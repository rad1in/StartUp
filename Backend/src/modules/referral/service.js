const { randomUUID, randomBytes } = require('crypto');
const { pool } = require('../../lib/db');
const { getSetting } = require('../../lib/platformSettings');
const { adjustBalance } = require('../wallet/service');

const DEFAULT_REWARD = 10000;

function generateCode() {
  return randomBytes(4).toString('hex').toUpperCase(); // 8 chars, e.g. "A1B2C3D4"
}

async function getOrCreateCode(userId) {
  const [rows] = await pool.query('SELECT code FROM `ReferralCode` WHERE userId = ?', [userId]);
  if (rows[0]) return rows[0].code;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    try {
      await pool.query('INSERT INTO `ReferralCode` (userId, code) VALUES (?, ?)', [userId, code]);
      return code;
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
    }
  }
  throw new Error('ساخت کد معرفی ناموفق بود.');
}

// Called from auth/service.js register() right after the new user is
// created. Silently no-ops on an invalid/self-referral code — referral is a
// bonus, never a reason to fail registration.
async function registerReferral(refereeUserId, code) {
  if (!code) return;
  const [[owner]] = await pool.query('SELECT userId FROM `ReferralCode` WHERE code = ?', [code.trim().toUpperCase()]);
  if (!owner || owner.userId === refereeUserId) return;

  const rewardAmount = Number(await getSetting('referral.rewardAmount', DEFAULT_REWARD));
  await pool
    .query(
      'INSERT INTO `Referral` (id, referrerUserId, refereeUserId, rewardAmount) VALUES (?, ?, ?, ?)',
      [randomUUID(), owner.userId, refereeUserId, rewardAmount]
    )
    .catch(() => {}); // refereeUserId UNIQUE — already referred, ignore
}

// Called from orders/service.js after a customer's order succeeds. Pays out
// the pending referral (if any) exactly once.
async function completeReferralIfEligible(refereeUserId) {
  const [[referral]] = await pool.query(
    "SELECT * FROM `Referral` WHERE refereeUserId = ? AND status = 'PENDING'",
    [refereeUserId]
  );
  if (!referral) return;

  await pool.query("UPDATE `Referral` SET status = 'COMPLETED', completedAt = NOW() WHERE id = ?", [referral.id]);
  await adjustBalance(referral.referrerUserId, referral.rewardAmount, 'پاداش دعوت دوست');
  await adjustBalance(referral.refereeUserId, referral.rewardAmount, 'پاداش خوش‌آمدگویی (معرفی‌شده)');
}

async function getMyReferralInfo(userId) {
  const code = await getOrCreateCode(userId);
  const [referrals] = await pool.query(
    `SELECT r.status, r.rewardAmount, r.createdAt, r.completedAt, u.name AS refereeName
     FROM \`Referral\` r JOIN \`User\` u ON u.id = r.refereeUserId
     WHERE r.referrerUserId = ? ORDER BY r.createdAt DESC`,
    [userId]
  );
  const totalEarned = referrals
    .filter((r) => r.status === 'COMPLETED')
    .reduce((sum, r) => sum + Number(r.rewardAmount), 0);
  const rewardAmount = Number(await getSetting('referral.rewardAmount', DEFAULT_REWARD));
  return { code, rewardAmount, referrals, totalEarned, completedCount: referrals.filter((r) => r.status === 'COMPLETED').length };
}

module.exports = { getOrCreateCode, registerReferral, completeReferralIfEligible, getMyReferralInfo };
