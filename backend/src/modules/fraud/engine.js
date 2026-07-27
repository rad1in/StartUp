'use strict';
const { v4: uuid } = require('uuid');
const { pool } = require('../../lib/db');
const rules = require('./rules');
const { notifyAdmins } = require('../adminNotifications/service');

// Rules where a very high score reliably means deliberate abuse rather than
// a legitimate customer just being active (unlike, say, ORDER_VOLUME_SPIKE
// on a venue, which a genuinely busy day can trigger) — safe to react to
// automatically without a human reviewing first.
const AUTO_RESPONSE_RULE_KEYS = new Set(['COUPON_ABUSE', 'DUPLICATE_TRIAL_ABUSE', 'FAILED_PAYMENT_SURGE']);
const AUTO_RESPONSE_MIN_SCORE = 85;

// Forces the flagged customer to re-authenticate everywhere (revokes every
// refresh token) rather than anything destructive — reversible, and the
// worst case on a false positive is an annoying extra login, not lost data.
async function autoRespond(hit) {
  if (hit.entityType !== 'CUSTOMER' || hit.riskScore < AUTO_RESPONSE_MIN_SCORE) return;
  if (!AUTO_RESPONSE_RULE_KEYS.has(hit.ruleKey)) return;
  const { forceLogout } = require('../admin/service');
  const { logActivity } = require('../../lib/activityLog');
  await forceLogout(hit.entityId, null);
  await logActivity(null, null, 'FRAUD_AUTO_FORCE_LOGOUT', 'User', hit.entityId, {
    ruleKey: hit.ruleKey,
    riskScore: hit.riskScore,
    reason: hit.reason,
  });
}

async function runDetection() {
  const results = { flagsCreated: 0, flagsUpdated: 0, errors: [] };

  for (const rule of rules) {
    let hits;
    try {
      hits = await rule();
    } catch (err) {
      results.errors.push({ rule: rule.name, error: err.message });
      continue;
    }

    for (const hit of hits) {
      try {
        const [[existing]] = await pool.query(
          `SELECT id, status FROM FraudFlag
           WHERE entityType = ? AND entityId = ? AND ruleKey = ?
           AND status IN ('OPEN', 'REVIEWING')`,
          [hit.entityType, hit.entityId, hit.ruleKey]
        );

        if (existing) {
          await pool.query(
            'UPDATE FraudFlag SET riskScore = ?, reason = ?, updatedAt = NOW() WHERE id = ?',
            [hit.riskScore, hit.reason, existing.id]
          );
          results.flagsUpdated++;
        } else {
          await pool.query(
            `INSERT INTO FraudFlag (id, entityType, entityId, ruleKey, reason, riskScore)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [uuid(), hit.entityType, hit.entityId, hit.ruleKey, hit.reason, hit.riskScore]
          );
          results.flagsCreated++;
          const willAutoRespond =
            hit.entityType === 'CUSTOMER' && hit.riskScore >= AUTO_RESPONSE_MIN_SCORE && AUTO_RESPONSE_RULE_KEYS.has(hit.ruleKey);
          if (hit.riskScore >= 70) {
            notifyAdmins({
              type: 'FRAUD_CRITICAL',
              title: `پرچم تقلب پرخطر: ${hit.reason}`,
              body:
                `امتیاز ریسک ${hit.riskScore} — نیازمند بررسی فوری.` +
                (willAutoRespond ? ' نشست‌های این کاربر به‌صورت خودکار باطل شد و باید دوباره وارد شود.' : ''),
              severity: 'CRITICAL',
              link: '/admin/fraud',
            }).catch(() => {});
          }
          if (willAutoRespond) {
            await autoRespond(hit).catch((err) => {
              results.errors.push({ rule: hit.ruleKey, entityId: hit.entityId, error: `autoRespond: ${err.message}` });
            });
          }
        }
      } catch (err) {
        results.errors.push({ rule: rule.name, entityId: hit.entityId, error: err.message });
      }
    }
  }

  return results;
}

module.exports = { runDetection };
