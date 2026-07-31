const { pool } = require('../../lib/db');

async function listFavoriteVenues(userId) {
  const [rows] = await pool.query(
    `SELECT v.*, f.createdAt AS favoritedAt FROM \`FavoriteVenue\` f
     JOIN \`Venue\` v ON v.id = f.venueId
     WHERE f.userId = ? ORDER BY f.createdAt DESC`,
    [userId]
  );
  return rows;
}

async function addFavoriteVenue(userId, venueId) {
  await pool.query('INSERT IGNORE INTO `FavoriteVenue` (userId, venueId) VALUES (?, ?)', [userId, venueId]);
}

async function removeFavoriteVenue(userId, venueId) {
  await pool.query('DELETE FROM `FavoriteVenue` WHERE userId = ? AND venueId = ?', [userId, venueId]);
}

async function listFavoriteItems(userId) {
  const [rows] = await pool.query(
    `SELECT mi.*, f.createdAt AS favoritedAt, f.savedCustomization, f.nickname
     FROM \`FavoriteMenuItem\` f
     JOIN \`MenuItem\` mi ON mi.id = f.menuItemId
     WHERE f.userId = ? ORDER BY f.createdAt DESC`,
    [userId]
  );
  return rows;
}

async function addFavoriteItem(userId, menuItemId, { savedCustomization, nickname } = {}) {
  await pool.query(
    `INSERT INTO \`FavoriteMenuItem\` (userId, menuItemId, savedCustomization, nickname) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE savedCustomization = COALESCE(VALUES(savedCustomization), savedCustomization),
                             nickname = COALESCE(VALUES(nickname), nickname)`,
    [userId, menuItemId, savedCustomization ? JSON.stringify(savedCustomization) : null, nickname || null]
  );
}

async function updateFavoriteItem(userId, menuItemId, { savedCustomization, nickname } = {}) {
  const sets = [];
  const params = [];
  if (savedCustomization !== undefined) { sets.push('savedCustomization = ?'); params.push(JSON.stringify(savedCustomization)); }
  if (nickname !== undefined) { sets.push('nickname = ?'); params.push(nickname); }
  if (sets.length === 0) return;
  params.push(userId, menuItemId);
  await pool.query(
    `UPDATE \`FavoriteMenuItem\` SET ${sets.join(', ')} WHERE userId = ? AND menuItemId = ?`,
    params
  );
}

async function removeFavoriteItem(userId, menuItemId) {
  await pool.query('DELETE FROM `FavoriteMenuItem` WHERE userId = ? AND menuItemId = ?', [userId, menuItemId]);
}

async function listRecentlyViewed(userId) {
  const [rows] = await pool.query(
    `SELECT v.*, r.viewedAt FROM \`RecentlyViewedVenue\` r
     JOIN \`Venue\` v ON v.id = r.venueId
     WHERE r.userId = ? ORDER BY r.viewedAt DESC LIMIT 10`,
    [userId]
  );
  return rows;
}

async function recordVenueView(userId, venueId) {
  if (!userId) return;
  await pool.query(
    `INSERT INTO \`RecentlyViewedVenue\` (userId, venueId, viewedAt) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE viewedAt = NOW()`,
    [userId, venueId]
  );
}

module.exports = {
  listFavoriteVenues,
  addFavoriteVenue,
  removeFavoriteVenue,
  listFavoriteItems,
  addFavoriteItem,
  updateFavoriteItem,
  removeFavoriteItem,
  listRecentlyViewed,
  recordVenueView,
};
