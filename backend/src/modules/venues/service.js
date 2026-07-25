const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, updateById, deleteById } = require('../../lib/sqlHelpers');
const { commissionRateForTier } = require('../../utils/commission');
const { levelForRatio } = require('../../utils/occupancy');
const { emitToVenue } = require('../../sockets');
const { scheduleTranslation, applyTranslation, applyTranslationToList } = require('../../lib/autoTranslate');

// Attaches average rating/review count (from Review) and average menu price
// (from MenuItem) to each venue, and parses the `tags` JSON column into an
// array — MariaDB's JSON type is a TEXT alias so it comes back as a string.
async function attachStats(venues) {
  if (venues.length === 0) return [];
  const ids = venues.map((v) => v.id);
  const placeholders = ids.map(() => '?').join(', ');

  const [ratingRows] = await pool.query(
    `SELECT venueId, AVG(rating) AS avgRating, COUNT(*) AS reviewCount
     FROM \`Review\` WHERE venueId IN (${placeholders}) GROUP BY venueId`,
    ids
  );
  const [priceRows] = await pool.query(
    `SELECT venueId, AVG(price) AS avgPrice
     FROM \`MenuItem\` WHERE venueId IN (${placeholders}) GROUP BY venueId`,
    ids
  );

  const ratingByVenue = new Map(
    ratingRows.map((r) => [r.venueId, { avgRating: Number(r.avgRating), reviewCount: Number(r.reviewCount) }])
  );
  const priceByVenue = new Map(priceRows.map((r) => [r.venueId, Number(r.avgPrice)]));

  return venues.map((venue) => ({
    ...venue,
    tags: venue.tags ? (typeof venue.tags === 'string' ? JSON.parse(venue.tags) : venue.tags) : [],
    averageRating: ratingByVenue.get(venue.id)?.avgRating ?? null,
    reviewCount: ratingByVenue.get(venue.id)?.reviewCount ?? 0,
    averagePrice: priceByVenue.get(venue.id) ?? null,
  }));
}

// Crowd density per venue: "active" tables are those with at least one
// PENDING-payment order right now (same definition already used by
// `listTables`'s `isActive` flag) — this is the existing occupancy signal,
// just aggregated per-venue and classified via `levelForRatio`.
async function computeOccupancy(venueId) {
  const [[{ totalTables }]] = await pool.query(
    'SELECT COUNT(*) AS totalTables FROM `VenueTable` WHERE venueId = ?',
    [venueId]
  );
  const [[{ activeTables }]] = await pool.query(
    "SELECT COUNT(DISTINCT tableId) AS activeTables FROM `Order` WHERE venueId = ? AND tableId IS NOT NULL AND paymentStatus = 'PENDING'",
    [venueId]
  );
  const total = Number(totalTables);
  const active = Number(activeTables);
  return { level: levelForRatio(active, total), activeTables: active, totalTables: total };
}

async function attachOccupancy(venues) {
  if (venues.length === 0) return [];
  const ids = venues.map((v) => v.id);
  const placeholders = ids.map(() => '?').join(', ');

  const [tableRows] = await pool.query(
    `SELECT venueId, COUNT(*) AS totalTables FROM \`VenueTable\` WHERE venueId IN (${placeholders}) GROUP BY venueId`,
    ids
  );
  const [activeRows] = await pool.query(
    `SELECT venueId, COUNT(DISTINCT tableId) AS activeTables FROM \`Order\`
     WHERE venueId IN (${placeholders}) AND tableId IS NOT NULL AND paymentStatus = 'PENDING' GROUP BY venueId`,
    ids
  );

  const totalByVenue = new Map(tableRows.map((r) => [r.venueId, Number(r.totalTables)]));
  const activeByVenue = new Map(activeRows.map((r) => [r.venueId, Number(r.activeTables)]));

  return venues.map((venue) => {
    const totalTables = totalByVenue.get(venue.id) ?? 0;
    const activeTables = activeByVenue.get(venue.id) ?? 0;
    return {
      ...venue,
      occupancy: { level: levelForRatio(activeTables, totalTables), activeTables, totalTables },
    };
  });
}

// Recomputes and broadcasts a venue's occupancy after an order mutation that
// could change it (created, paid/failed/refunded, voided). Never throws —
// occupancy is a nice-to-have live indicator, not core order flow.
async function notifyOccupancyChange(venueId) {
  try {
    const occupancy = await computeOccupancy(venueId);
    emitToVenue(venueId, 'venue:occupancy', { venueId, occupancy });
  } catch (err) {
    console.error('notifyOccupancyChange failed', err);
  }
}

async function listVenues({ publicOnly = true, lang } = {}) {
  const query = publicOnly
    ? "SELECT * FROM `Venue` WHERE status = 'ACTIVE' ORDER BY createdAt DESC"
    : 'SELECT * FROM `Venue` ORDER BY createdAt DESC';
  const [rows] = await pool.query(query);
  const withStats = await attachStats(rows);
  const withOccupancy = await attachOccupancy(withStats);
  return applyTranslationToList(withOccupancy, lang, ['name', 'description']);
}

async function getVenue(id, lang) {
  const venue = await findById('Venue', id);
  if (!venue) {
    const err = new Error('مجموعه مورد نظر یافت نشد.');
    err.status = 404;
    throw err;
  }

  const [categories] = await pool.query('SELECT * FROM `Category` WHERE venueId = ? ORDER BY sortOrder ASC', [id]);
  const [menuItems] = await pool.query('SELECT * FROM `MenuItem` WHERE venueId = ?', [id]);
  const [tables] = await pool.query('SELECT * FROM `VenueTable` WHERE venueId = ?', [id]);
  const [withStats] = await attachStats([venue]);
  const [withOccupancy] = await attachOccupancy([withStats]);
  const translatedVenue = applyTranslation(withOccupancy, lang, ['name', 'description']);
  const translatedCategories = applyTranslationToList(categories, lang, ['name']);
  const translatedItems = applyTranslationToList(menuItems, lang, ['name', 'description', 'tags']);

  return { ...translatedVenue, categories: translatedCategories, menuItems: translatedItems, tables };
}

async function createVenue({
  ownerId,
  name,
  description,
  address,
  city,
  neighborhood,
  tags,
  lat,
  lng,
  subscriptionTier,
  status,
}) {
  const tier = subscriptionTier || 'FREE';
  const id = randomUUID();
  await pool.query(
    `INSERT INTO \`Venue\` (id, ownerId, name, description, address, city, neighborhood, tags, lat, lng, subscriptionTier, commissionRate, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      ownerId,
      name,
      description || null,
      address || null,
      city || null,
      neighborhood || null,
      Array.isArray(tags) ? JSON.stringify(tags) : null,
      lat,
      lng,
      tier,
      await commissionRateForTier(tier),
      status || 'PENDING',
    ]
  );
  scheduleTranslation('Venue', id, { name, description });
  return findById('Venue', id);
}

// Self-service cafe registration: a CUSTOMER submits their cafe's basic info,
// gets upgraded to VENUE_OWNER with the new venue as their primary assignment.
// The venue starts PENDING so the platform team approves it before it goes public.
async function registerOwnVenue(userId, { name, description, address, city, neighborhood, cuisineType }) {
  if (!name || !name.trim()) {
    const err = new Error('نام کافه الزامی است.');
    err.status = 400;
    throw err;
  }
  if (!address || !address.trim()) {
    const err = new Error('آدرس کافه الزامی است.');
    err.status = 400;
    throw err;
  }

  const [[user]] = await pool.query('SELECT id, role FROM `User` WHERE id = ?', [userId]);
  if (!user) {
    const err = new Error('کاربر یافت نشد.');
    err.status = 404;
    throw err;
  }
  if (user.role !== 'CUSTOMER') {
    const err = new Error('حساب شما هم‌اکنون یک مجموعه ثبت‌شده دارد. از پنل مجموعه، بخش «شعبات» استفاده کنید.');
    err.status = 400;
    throw err;
  }

  // lat/lng are NOT NULL in the schema — start at Tehran's center; the owner
  // pins the exact spot later via the location picker in venue settings.
  const venue = await createVenue({
    ownerId: userId,
    name: name.trim(),
    description,
    address: address.trim(),
    city: city || 'تهران',
    neighborhood,
    tags: [],
    lat: 35.6892,
    lng: 51.389,
    status: 'PENDING',
  });
  if (cuisineType) {
    await pool.query('UPDATE `Venue` SET cuisineType = ? WHERE id = ?', [cuisineType, venue.id]);
  }

  await pool.query("UPDATE `User` SET role = 'VENUE_OWNER', venueId = ? WHERE id = ?", [venue.id, userId]);

  return findById('Venue', venue.id);
}

async function updateVenue(id, data) {
  const updateData = { ...data };
  if (data.subscriptionTier) {
    updateData.commissionRate = await commissionRateForTier(data.subscriptionTier);
  }
  if (data.openingHours !== undefined) {
    updateData.openingHours = data.openingHours ? JSON.stringify(data.openingHours) : null;
  }
  if (data.tags !== undefined) {
    updateData.tags = Array.isArray(data.tags) ? JSON.stringify(data.tags) : null;
  }
  const venue = await updateById('Venue', id, updateData, [
    'name',
    'description',
    'address',
    'phone',
    'city',
    'neighborhood',
    'tags',
    'lat',
    'lng',
    'logoUrl',
    'coverImageUrl',
    'cuisineType',
    'openingHours',
    'subscriptionTier',
    'commissionRate',
    'acceptsPickup',
    'economicCode',
    'legalName',
    'nationalId',
    'postalCode',
  ]);
  if (data.name !== undefined || data.description !== undefined) {
    scheduleTranslation('Venue', id, {
      name: data.name ?? venue.name,
      description: data.description ?? venue.description,
    });
  }
  const [withStats] = await attachStats([venue]);
  return withStats;
}

// Instant "closed today" toggle — independent of the weekly openingHours
// config, so a venue can shut ordering for an unplanned reason (ran out of
// stock, staff shortage) without touching its regular schedule.
async function setTemporaryClosure(id, isClosed, reason = null) {
  return updateById(
    'Venue',
    id,
    { isTemporarilyClosed: isClosed, temporarilyClosedReason: isClosed ? reason : null },
    ['isTemporarilyClosed', 'temporarilyClosedReason']
  );
}

async function setStatus(id, status, statusReason = null) {
  return updateById('Venue', id, { status, statusReason }, ['status', 'statusReason']);
}

async function setImage(id, field, url) {
  return updateById('Venue', id, { [field]: url }, ['logoUrl', 'coverImageUrl']);
}

// Haversine formula (meters) to find venues within `radius` of (lat, lng).
async function findNearby(lat, lng, radius = 100) {
  const [rows] = await pool.query(
    `SELECT *, (
      6371000 * acos(
        cos(radians(?)) * cos(radians(lat)) *
        cos(radians(lng) - radians(?)) +
        sin(radians(?)) * sin(radians(lat))
      )
    ) AS distanceMeters
    FROM \`Venue\`
    HAVING distanceMeters <= ? AND status = 'ACTIVE'
    ORDER BY isFeatured DESC, distanceMeters ASC`,
    [lat, lng, lat, radius]
  );
  const withStats = await attachStats(rows);
  return attachOccupancy(withStats);
}

async function createTable(venueId, tableNumber) {
  const id = randomUUID();
  await pool.query('INSERT INTO `VenueTable` (id, venueId, tableNumber, qrToken) VALUES (?, ?, ?, ?)', [
    id,
    venueId,
    tableNumber,
    randomUUID(),
  ]);
  return findById('VenueTable', id);
}

async function updateTable(tableId, tableNumber) {
  return updateById('VenueTable', tableId, { tableNumber }, ['tableNumber']);
}

async function deleteTable(tableId) {
  return deleteById('VenueTable', tableId);
}

async function listTables(venueId) {
  const [tables] = await pool.query('SELECT * FROM `VenueTable` WHERE venueId = ?', [venueId]);
  if (tables.length === 0) return [];

  const [activeOrders] = await pool.query(
    "SELECT DISTINCT tableId FROM `Order` WHERE venueId = ? AND tableId IS NOT NULL AND paymentStatus = 'PENDING'",
    [venueId]
  );
  const activeTableIds = new Set(activeOrders.map((o) => o.tableId));

  return tables.map((table) => ({ ...table, isActive: activeTableIds.has(table.id) }));
}

async function resolveQrToken(qrToken) {
  const [rows] = await pool.query('SELECT * FROM `VenueTable` WHERE qrToken = ?', [qrToken]);
  const table = rows[0];
  if (!table) {
    const err = new Error('کد QR نامعتبر است.');
    err.status = 404;
    throw err;
  }
  return { venueId: table.venueId, tableId: table.id, tableNumber: table.tableNumber };
}

async function createSubscriptionRequest(venueId, requestedTier) {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `SubscriptionChangeRequest` (id, venueId, requestedTier) VALUES (?, ?, ?)',
    [id, venueId, requestedTier]
  );
  return findById('SubscriptionChangeRequest', id);
}

async function listSubscriptionRequests(venueId) {
  const [rows] = await pool.query(
    'SELECT * FROM `SubscriptionChangeRequest` WHERE venueId = ? ORDER BY createdAt DESC',
    [venueId]
  );
  return rows;
}

module.exports = {
  listVenues,
  getVenue,
  createVenue,
  registerOwnVenue,
  updateVenue,
  setStatus,
  setTemporaryClosure,
  setImage,
  findNearby,
  createTable,
  updateTable,
  deleteTable,
  listTables,
  resolveQrToken,
  createSubscriptionRequest,
  listSubscriptionRequests,
  computeOccupancy,
  attachOccupancy,
  notifyOccupancyChange,
};
