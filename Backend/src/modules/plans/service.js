'use strict';
const { v4: uuid } = require('uuid');
const { pool } = require('../../lib/db');

function parseFeatures(row) {
  if (!row) return null;
  return { ...row, features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features };
}

async function listPlans() {
  const [rows] = await pool.query('SELECT * FROM PlanConfig WHERE isActive = 1 ORDER BY sortOrder');
  return rows.map(parseFeatures);
}

async function getPlan(tier) {
  const [[row]] = await pool.query('SELECT * FROM PlanConfig WHERE tier = ?', [tier]);
  return parseFeatures(row);
}

async function updatePlan(tier, data) {
  const allowed = ['name', 'commissionRate', 'monthlyPrice', 'yearlyPrice', 'yearlyDiscountPct', 'trialDays', 'features', 'isActive'];
  const fields = [];
  const params = [];
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k)) {
      fields.push(`\`${k}\` = ?`);
      params.push(k === 'features' ? JSON.stringify(v) : v);
    }
  }
  if (!fields.length) return;
  params.push(tier);
  await pool.query(`UPDATE PlanConfig SET ${fields.join(', ')} WHERE tier = ?`, params);
}

async function getTrialSettings() {
  const [rows] = await pool.query(
    "SELECT `key`, `value` FROM PlatformSetting WHERE `key` IN ('trial.shortDays', 'trial.longDays', 'trial.revenueThreshold')"
  );
  const s = {};
  for (const r of rows) s[r.key] = JSON.parse(r.value);
  return {
    shortDays:        s['trial.shortDays']          ?? 5,
    longDays:         s['trial.longDays']           ?? 7,
    revenueThreshold: s['trial.revenueThreshold']   ?? 5000000,
  };
}

async function updateTrialSettings({ shortDays, longDays, revenueThreshold }) {
  const pairs = [['trial.shortDays', shortDays], ['trial.longDays', longDays], ['trial.revenueThreshold', revenueThreshold]];
  for (const [key, value] of pairs) {
    if (value === undefined) continue;
    await pool.query(
      'INSERT INTO PlatformSetting (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
      [key, JSON.stringify(value), JSON.stringify(value)]
    );
  }
}

async function getTrialRevenueDuringTrial(venueId, since) {
  const [[{ revenue }]] = await pool.query(
    "SELECT COALESCE(SUM(totalAmount), 0) AS revenue FROM `Order` WHERE venueId = ? AND paymentStatus = 'SUCCESS' AND createdAt >= ?",
    [venueId, since]
  );
  return Number(revenue);
}

async function getTrialStatus(venueId) {
  const [[trial]] = await pool.query('SELECT * FROM VenueTrial WHERE venueId = ?', [venueId]);
  if (!trial) return null;

  const settings = await getTrialSettings();
  const revenue = await getTrialRevenueDuringTrial(venueId, trial.startedAt);
  const effectiveDays = revenue >= settings.revenueThreshold ? settings.longDays : settings.shortDays;
  const effectiveEnd = new Date(new Date(trial.startedAt).getTime() + effectiveDays * 86400000);
  const isActive = trial.status === 'ACTIVE' && new Date() < effectiveEnd;

  if (!isActive && trial.status === 'ACTIVE') {
    await pool.query("UPDATE VenueTrial SET status = 'EXPIRED' WHERE id = ?", [trial.id]);
    trial.status = 'EXPIRED';
  }

  return {
    ...trial,
    effectiveDays,
    effectiveEnd,
    isActive,
    revenue,
    revenueThreshold: settings.revenueThreshold,
    daysRemaining: isActive ? Math.max(0, Math.ceil((effectiveEnd - new Date()) / 86400000)) : 0,
  };
}

async function startTrial(venueId, ownerId, tier, { phone, businessId, bankAccount } = {}) {
  const [[existingTrial]] = await pool.query('SELECT id FROM VenueTrial WHERE venueId = ?', [venueId]);
  if (existingTrial) throw new Error('این مجموعه قبلاً از دوره آزمایشی استفاده کرده است.');

  // Check if this owner already has a trial anywhere
  const [[ownerPrior]] = await pool.query(
    `SELECT vt.id FROM VenueTrial vt
     JOIN TrialFingerprint tf ON tf.venueTrialId = vt.id
     WHERE tf.ownerId = ? AND vt.venueId != ?`,
    [ownerId, venueId]
  );
  if (ownerPrior) {
    await flagAbuse(ownerId, venueId, 'مالک مجموعه از طریق مجموعه دیگری قبلاً آزمایشی دریافت کرده است.');
    throw new Error('دوره آزمایشی تکراری شناسایی شد. درخواست رد شد.');
  }

  // Check phone/businessId fingerprint against other owners
  if (phone || businessId) {
    const conditions = [];
    const params = [];
    if (phone)      { conditions.push('tf.phone = ?');      params.push(phone); }
    if (businessId) { conditions.push('tf.businessId = ?'); params.push(businessId); }
    const [dupes] = await pool.query(
      `SELECT tf.ownerId FROM TrialFingerprint tf WHERE (${conditions.join(' OR ')}) AND tf.ownerId != ?`,
      [...params, ownerId]
    );
    if (dupes.length > 0) {
      await flagAbuse(ownerId, venueId, `مشخصات هویتی (${phone ? 'تلفن' : ''}${businessId ? '/شناسه کسب‌وکار' : ''}) با حساب دیگری مطابقت دارد.`);
      throw new Error('اطلاعات هویتی تکراری شناسایی شد. درخواست رد شد.');
    }
  }

  const settings = await getTrialSettings();
  const trialId = uuid();
  const endsAt = new Date(Date.now() + settings.longDays * 86400000);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'INSERT INTO VenueTrial (id, venueId, ownerId, tier, endsAt) VALUES (?, ?, ?, ?, ?)',
      [trialId, venueId, ownerId, tier, endsAt]
    );
    await conn.query(
      'INSERT INTO TrialFingerprint (id, ownerId, venueTrialId, phone, businessId, bankAccount) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid(), ownerId, trialId, phone || null, businessId || null, bankAccount || null]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  return { id: trialId, endsAt, tier, shortDays: settings.shortDays, longDays: settings.longDays };
}

async function flagAbuse(ownerId, venueId, reason) {
  try {
    await pool.query(
      `INSERT IGNORE INTO FraudFlag (id, entityType, entityId, ruleKey, reason, riskScore)
       VALUES (?, 'CUSTOMER', ?, 'DUPLICATE_TRIAL_ABUSE', ?, 85)`,
      [uuid(), ownerId, `${reason} — مجموعه: ${venueId}`]
    );
  } catch (_) { /* non-fatal */ }
}

async function convertTrial(venueId) {
  await pool.query(
    "UPDATE VenueTrial SET status = 'CONVERTED', convertedAt = NOW() WHERE venueId = ? AND status = 'ACTIVE'",
    [venueId]
  );
}

module.exports = {
  listPlans,
  getPlan,
  updatePlan,
  getTrialSettings,
  updateTrialSettings,
  getTrialStatus,
  startTrial,
  convertTrial,
};
