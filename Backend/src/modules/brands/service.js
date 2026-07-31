const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, updateById } = require('../../lib/sqlHelpers');

async function listBrandsForOwner(ownerId) {
  const [brands] = await pool.query('SELECT * FROM `VenueBrand` WHERE ownerId = ? ORDER BY name ASC', [ownerId]);
  if (brands.length === 0) return [];
  const brandIds = brands.map((b) => b.id);
  const placeholders = brandIds.map(() => '?').join(', ');
  const [venues] = await pool.query(
    'SELECT id, brandId, name, address, city, lat, lng, status, logoUrl, coverImageUrl FROM `Venue` WHERE brandId IN (' + placeholders + ')',
    brandIds
  );
  const venuesByBrand = new Map();
  for (const v of venues) {
    if (!venuesByBrand.has(v.brandId)) venuesByBrand.set(v.brandId, []);
    venuesByBrand.get(v.brandId).push(v);
  }
  return brands.map((b) => ({ ...b, venues: venuesByBrand.get(b.id) || [] }));
}

async function createBrand(ownerId, { name, logoUrl }) {
  const id = randomUUID();
  await pool.query('INSERT INTO `VenueBrand` (id, ownerId, name, logoUrl) VALUES (?, ?, ?, ?)', [id, ownerId, name, logoUrl || null]);
  const [[row]] = await pool.query('SELECT * FROM `VenueBrand` WHERE id = ?', [id]);
  return row;
}

async function updateBrand(id, ownerId, data) {
  const [[brand]] = await pool.query('SELECT * FROM `VenueBrand` WHERE id = ? AND ownerId = ?', [id, ownerId]);
  if (!brand) {
    const err = new Error('برند یافت نشد.');
    err.status = 404;
    throw err;
  }
  const fields = [];
  const values = [];
  for (const [k, v] of Object.entries(data)) {
    if (['name', 'logoUrl'].includes(k)) { fields.push(`\`${k}\` = ?`); values.push(v); }
  }
  if (fields.length > 0) await pool.query(`UPDATE \`VenueBrand\` SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
  const [[row]] = await pool.query('SELECT * FROM `VenueBrand` WHERE id = ?', [id]);
  return row;
}

async function deleteBrand(id, ownerId) {
  const [[brand]] = await pool.query('SELECT * FROM `VenueBrand` WHERE id = ? AND ownerId = ?', [id, ownerId]);
  if (!brand) {
    const err = new Error('برند یافت نشد.');
    err.status = 404;
    throw err;
  }
  // Unlink all venues before deleting
  await pool.query('UPDATE `Venue` SET brandId = NULL WHERE brandId = ?', [id]);
  await pool.query('DELETE FROM `VenueBrand` WHERE id = ?', [id]);
}

// Only the requester's OWN venues that aren't yet attached to any brand — this
// is the trusted source for the "add branch" picker, so an owner can never even
// see, let alone attach, a cafe that belongs to someone else.
async function listAvailableVenuesForOwner(ownerId) {
  const [rows] = await pool.query(
    `SELECT id, name, address, city, status, logoUrl
     FROM \`Venue\`
     WHERE ownerId = ? AND brandId IS NULL
     ORDER BY name ASC`,
    [ownerId]
  );
  return rows;
}

async function addVenueToBrand(brandId, venueId, ownerId) {
  const [[brand]] = await pool.query('SELECT * FROM `VenueBrand` WHERE id = ? AND ownerId = ?', [brandId, ownerId]);
  if (!brand) {
    const err = new Error('برند یافت نشد.');
    err.status = 404;
    throw err;
  }
  // Verify the target venue is actually owned by this owner BEFORE mutating —
  // reject explicitly instead of silently no-op'ing so a spoofed venueId can't
  // pass unnoticed and can't ever be attributed to someone else's cafe.
  const [[venue]] = await pool.query('SELECT ownerId FROM `Venue` WHERE id = ?', [venueId]);
  if (!venue) {
    const err = new Error('مجموعه یافت نشد.');
    err.status = 404;
    throw err;
  }
  if (venue.ownerId !== ownerId) {
    const err = new Error('این مجموعه متعلق به شما نیست و نمی‌توانید آن را به برند خود اضافه کنید.');
    err.status = 403;
    throw err;
  }
  await pool.query('UPDATE `Venue` SET brandId = ? WHERE id = ? AND ownerId = ?', [brandId, venueId, ownerId]);
}

async function removeVenueFromBrand(venueId, ownerId) {
  await pool.query('UPDATE `Venue` SET brandId = NULL WHERE id = ? AND ownerId = ?', [venueId, ownerId]);
}

async function getBrandReport(brandId, ownerId, { from, to } = {}) {
  const [[brand]] = await pool.query('SELECT * FROM `VenueBrand` WHERE id = ? AND ownerId = ?', [brandId, ownerId]);
  if (!brand) {
    const err = new Error('برند یافت نشد.');
    err.status = 404;
    throw err;
  }
  const params = [brandId];
  let dateFilter = '';
  if (from) { dateFilter += ' AND o.createdAt >= ?'; params.push(from); }
  if (to) { dateFilter += ' AND o.createdAt <= ?'; params.push(to); }

  const [rows] = await pool.query(
    `SELECT v.id AS venueId, v.name AS venueName,
            COUNT(DISTINCT o.id) AS totalOrders,
            COALESCE(SUM(o.totalAmount), 0) AS totalRevenue,
            COALESCE(SUM(o.commissionAmount), 0) AS totalCommission,
            COUNT(DISTINCT o.customerId) AS uniqueCustomers
     FROM \`Venue\` v
     LEFT JOIN \`Order\` o ON o.venueId = v.id AND o.paymentStatus = 'SUCCESS' ${dateFilter}
     WHERE v.brandId = ?
     GROUP BY v.id, v.name
     ORDER BY totalRevenue DESC`,
    [...params.slice(1), brandId]
  );

  const totals = rows.reduce((acc, r) => ({
    totalOrders: acc.totalOrders + Number(r.totalOrders),
    totalRevenue: acc.totalRevenue + Number(r.totalRevenue),
    totalCommission: acc.totalCommission + Number(r.totalCommission),
    uniqueCustomers: acc.uniqueCustomers + Number(r.uniqueCustomers),
  }), { totalOrders: 0, totalRevenue: 0, totalCommission: 0, uniqueCustomers: 0 });

  return { brand, branches: rows, totals };
}

// --- Multi-branch staff management ---

async function assignStaffToBranch(staffUserId, venueId, ownerId) {
  const [[venue]] = await pool.query('SELECT id FROM `Venue` WHERE id = ? AND ownerId = ?', [venueId, ownerId]);
  if (!venue) {
    const err = new Error('شعبه یافت نشد.');
    err.status = 404;
    throw err;
  }
  await pool.query(
    'INSERT INTO `StaffVenueAccess` (userId, venueId) VALUES (?, ?) ON DUPLICATE KEY UPDATE createdAt = createdAt',
    [staffUserId, venueId]
  );
}

async function removeStaffFromBranch(staffUserId, venueId, ownerId) {
  const [[venue]] = await pool.query('SELECT id FROM `Venue` WHERE id = ? AND ownerId = ?', [venueId, ownerId]);
  if (!venue) {
    const err = new Error('شعبه یافت نشد.');
    err.status = 404;
    throw err;
  }
  await pool.query('DELETE FROM `StaffVenueAccess` WHERE userId = ? AND venueId = ?', [staffUserId, venueId]);
}

async function listStaffForBrand(brandId, ownerId) {
  const [[brand]] = await pool.query('SELECT id FROM `VenueBrand` WHERE id = ? AND ownerId = ?', [brandId, ownerId]);
  if (!brand) {
    const err = new Error('برند یافت نشد.');
    err.status = 404;
    throw err;
  }
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.venueId AS primaryVenueId,
            GROUP_CONCAT(sva.venueId) AS extraVenueIds
     FROM \`User\` u
     LEFT JOIN \`StaffVenueAccess\` sva ON sva.userId = u.id
     WHERE u.venueId IN (SELECT id FROM \`Venue\` WHERE brandId = ?)
        OR sva.venueId IN (SELECT id FROM \`Venue\` WHERE brandId = ?)
     GROUP BY u.id`,
    [brandId, brandId]
  );
  return rows;
}

module.exports = {
  listBrandsForOwner, createBrand, updateBrand, deleteBrand,
  listAvailableVenuesForOwner, addVenueToBrand, removeVenueFromBrand, getBrandReport,
  assignStaffToBranch, removeStaffFromBranch, listStaffForBrand,
};
