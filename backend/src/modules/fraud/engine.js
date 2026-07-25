'use strict';
const { v4: uuid } = require('uuid');
const { pool } = require('../../lib/db');
const rules = require('./rules');
const { notifyAdmins } = require('../adminNotifications/service');

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
          if (hit.riskScore >= 70) {
            notifyAdmins({
              type: 'FRAUD_CRITICAL',
              title: `پرچم تقلب پرخطر: ${hit.reason}`,
              body: `امتیاز ریسک ${hit.riskScore} — نیازمند بررسی فوری.`,
              severity: 'CRITICAL',
              link: '/admin/fraud',
            }).catch(() => {});
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
