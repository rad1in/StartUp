const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, updateById, deleteById } = require('../../lib/sqlHelpers');
const { getSetting, setSetting } = require('../../lib/platformSettings');

// --- FAQ ---

async function listFaq() {
  const [rows] = await pool.query('SELECT * FROM `FaqItem` ORDER BY sortOrder ASC');
  return rows;
}

async function createFaq({ question, answer, sortOrder }) {
  const id = randomUUID();
  await pool.query('INSERT INTO `FaqItem` (id, question, answer, sortOrder) VALUES (?, ?, ?, ?)', [
    id,
    question,
    answer,
    sortOrder || 0,
  ]);
  return findById('FaqItem', id);
}

async function updateFaq(id, data) {
  return updateById('FaqItem', id, data, ['question', 'answer', 'sortOrder']);
}

async function deleteFaq(id) {
  return deleteById('FaqItem', id);
}

// --- Banners ---

async function listBanners({ audience, activeOnly = false } = {}) {
  const conditions = [];
  const params = [];
  if (audience) {
    conditions.push('audience = ?');
    params.push(audience);
  }
  if (activeOnly) {
    conditions.push('isActive = TRUE');
    conditions.push('(startsAt IS NULL OR startsAt <= NOW())');
    conditions.push('(endsAt IS NULL OR endsAt >= NOW())');
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM \`Banner\` ${whereClause} ORDER BY createdAt DESC`, params);
  return rows;
}

async function createBanner({ title, body, audience, startsAt, endsAt }) {
  const id = randomUUID();
  await pool.query('INSERT INTO `Banner` (id, title, body, audience, startsAt, endsAt) VALUES (?, ?, ?, ?, ?, ?)', [
    id,
    title,
    body || null,
    audience || 'CUSTOMER',
    startsAt ? new Date(startsAt) : null,
    endsAt ? new Date(endsAt) : null,
  ]);
  return findById('Banner', id);
}

async function updateBanner(id, data) {
  return updateById('Banner', id, data, ['title', 'body', 'audience', 'isActive', 'startsAt', 'endsAt']);
}

async function deleteBanner(id) {
  return deleteById('Banner', id);
}

// --- Platform settings ---

async function getDiscoverySettings() {
  return {
    radiusMeters: await getSetting('discovery.radiusMeters', 100),
    supportedCities: await getSetting('platform.supportedCities', []),
  };
}

async function updateDiscoverySettings({ radiusMeters, supportedCities }) {
  if (radiusMeters !== undefined) await setSetting('discovery.radiusMeters', Number(radiusMeters));
  if (supportedCities !== undefined) await setSetting('platform.supportedCities', supportedCities);
  return getDiscoverySettings();
}

// --- Feature flags ---
// A fixed, known catalogue (not arbitrary keys) so the admin UI and the
// client code that reads each flag stay in sync — a typo'd flag name would
// otherwise silently do nothing.
const FEATURE_FLAG_DEFS = [
  { key: 'groupOrdering', label: 'سفارش گروهی روی میز', default: true },
  { key: 'reservations', label: 'رزرو میز', default: true },
  { key: 'otpLogin', label: 'ورود با کد پیامکی', default: true },
  { key: 'googleLogin', label: 'ورود با گوگل', default: true },
];

async function getFeatureFlags() {
  const stored = await getSetting('platform.featureFlags', {});
  const flags = {};
  for (const def of FEATURE_FLAG_DEFS) {
    flags[def.key] = stored[def.key] !== undefined ? Boolean(stored[def.key]) : def.default;
  }
  return flags;
}

async function updateFeatureFlags(patch) {
  const current = await getSetting('platform.featureFlags', {});
  const validKeys = new Set(FEATURE_FLAG_DEFS.map((d) => d.key));
  const next = { ...current };
  for (const [key, value] of Object.entries(patch || {})) {
    if (validKeys.has(key)) next[key] = Boolean(value);
  }
  await setSetting('platform.featureFlags', next);
  return getFeatureFlags();
}

module.exports = {
  listFaq,
  createFaq,
  updateFaq,
  deleteFaq,
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getDiscoverySettings,
  updateDiscoverySettings,
  getFeatureFlags,
  updateFeatureFlags,
  FEATURE_FLAG_DEFS,
};
