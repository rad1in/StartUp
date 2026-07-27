const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, updateById } = require('../../lib/sqlHelpers');
const { sanitizeUser } = require('../auth/service');
const { signAccessToken } = require('../../lib/jwt');
const { commissionRateForTier } = require('../../utils/commission');
const { logActivity, listActivity } = require('../../lib/activityLog');
const { emitToAdmins, emitToCustomer, getConnectedClientCount } = require('../../sockets');
const { getSetting, setSetting } = require('../../lib/platformSettings');
const { normalizeIp } = require('../../middleware/ipBlocklist');

async function listUsers() {
  const [rows] = await pool.query('SELECT * FROM `User` ORDER BY createdAt DESC');
  return rows.map(sanitizeUser);
}

async function updateUserRole(userId, role, venueId) {
  const data = { role };
  if (venueId !== undefined) data.venueId = venueId;
  const user = await updateById('User', userId, data, ['role', 'venueId']);
  return sanitizeUser(user);
}

async function listVenuesWithOwners({ status, subscriptionTier, city, search } = {}) {
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('v.status = ?');
    params.push(status);
  }
  if (subscriptionTier) {
    conditions.push('v.subscriptionTier = ?');
    params.push(subscriptionTier);
  }
  if (city) {
    conditions.push('v.city = ?');
    params.push(city);
  }
  if (search) {
    conditions.push('v.name LIKE ?');
    params.push(`%${search}%`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [venues] = await pool.query(
    `SELECT v.* FROM \`Venue\` v ${whereClause} ORDER BY v.createdAt DESC`,
    params
  );
  if (venues.length === 0) return [];

  const ownerIds = [...new Set(venues.map((v) => v.ownerId))];
  const placeholders = ownerIds.map(() => '?').join(', ');
  const [owners] = await pool.query(`SELECT * FROM \`User\` WHERE id IN (${placeholders})`, ownerIds);
  const ownerById = new Map(owners.map((o) => [o.id, sanitizeUser(o)]));

  return venues.map((venue) => ({ ...venue, owner: ownerById.get(venue.ownerId) || null }));
}

async function updateVenueSubscription(venueId, subscriptionTier) {
  const venue = await updateById(
    'Venue',
    venueId,
    { subscriptionTier, commissionRate: await commissionRateForTier(subscriptionTier) },
    ['subscriptionTier', 'commissionRate']
  );

  // Resolve any pending subscription-change request for this tier so the venue
  // owner sees their request was actioned, without a separate approval step.
  await pool.query(
    `UPDATE \`SubscriptionChangeRequest\` SET status = 'APPROVED', resolvedAt = NOW()
     WHERE venueId = ? AND status = 'PENDING' AND requestedTier = ?`,
    [venueId, subscriptionTier]
  );
  await pool.query(
    `UPDATE \`SubscriptionChangeRequest\` SET status = 'REJECTED', resolvedAt = NOW()
     WHERE venueId = ? AND status = 'PENDING' AND requestedTier != ?`,
    [venueId, subscriptionTier]
  );

  emitToAdmins('subscription:changed', venue);
  return venue;
}

async function listPendingSubscriptionRequests() {
  const [rows] = await pool.query(
    `SELECT r.*, v.name AS venueName FROM \`SubscriptionChangeRequest\` r
     JOIN \`Venue\` v ON v.id = r.venueId
     WHERE r.status = 'PENDING' ORDER BY r.createdAt DESC`
  );
  return rows;
}

async function createPayout(venueId, { amount, periodStart, periodEnd }) {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `Payout` (id, venueId, amount, periodStart, periodEnd) VALUES (?, ?, ?, ?, ?)',
    [id, venueId, amount, new Date(periodStart), new Date(periodEnd)]
  );
  return findById('Payout', id);
}

async function markPayoutPaid(payoutId) {
  return updateById('Payout', payoutId, { status: 'PAID', paidAt: new Date() }, ['status', 'paidAt']);
}

async function listAllPayouts() {
  const [rows] = await pool.query(
    `SELECT p.*, v.name AS venueName FROM \`Payout\` p
     JOIN \`Venue\` v ON v.id = p.venueId
     ORDER BY p.createdAt DESC`
  );
  return rows;
}

async function platformStats() {
  const [[{ venueCount }]] = await pool.query('SELECT COUNT(*) AS venueCount FROM `Venue`');
  const [[{ userCount }]] = await pool.query('SELECT COUNT(*) AS userCount FROM `User`');
  const [[{ orderCount }]] = await pool.query('SELECT COUNT(*) AS orderCount FROM `Order`');
  const [[{ totalRevenue, totalCommission }]] = await pool.query(
    `SELECT COALESCE(SUM(totalAmount), 0) AS totalRevenue, COALESCE(SUM(commissionAmount), 0) AS totalCommission
     FROM \`Order\` WHERE paymentStatus = 'SUCCESS'`
  );

  return {
    venueCount: Number(venueCount),
    userCount: Number(userCount),
    orderCount: Number(orderCount),
    totalRevenue: Number(totalRevenue),
    totalCommission: Number(totalCommission),
  };
}

// --- Dashboard ---

function rangeStart(period) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'week') start.setDate(now.getDate() - 7);
  else if (period === 'month') start.setMonth(now.getMonth() - 1);
  else start.setHours(0, 0, 0, 0);
  return start;
}

async function kpis() {
  const [today, week, month] = await Promise.all([
    orderCountsSince(rangeStart('today')),
    orderCountsSince(rangeStart('week')),
    orderCountsSince(rangeStart('month')),
  ]);
  const [[{ venueCount }]] = await pool.query("SELECT COUNT(*) AS venueCount FROM `Venue` WHERE status = 'ACTIVE'");
  const [[{ customerCount }]] = await pool.query("SELECT COUNT(*) AS customerCount FROM `User` WHERE role = 'CUSTOMER'");
  const [[{ gmv, commission }]] = await pool.query(
    "SELECT COALESCE(SUM(totalAmount),0) AS gmv, COALESCE(SUM(commissionAmount),0) AS commission FROM `Order` WHERE paymentStatus = 'SUCCESS'"
  );

  return {
    venueCount: Number(venueCount),
    customerCount: Number(customerCount),
    ordersToday: today,
    ordersWeek: week,
    ordersMonth: month,
    gmv: Number(gmv),
    totalCommission: Number(commission),
  };
}

async function orderCountsSince(since) {
  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM `Order` WHERE createdAt >= ?', [since]);
  return Number(count);
}

async function growthSeries(days = 30) {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const [venueSignups] = await pool.query(
    'SELECT DATE(createdAt) AS day, COUNT(*) AS count FROM `Venue` WHERE createdAt >= ? GROUP BY day ORDER BY day ASC',
    [start]
  );
  const [customerSignups] = await pool.query(
    "SELECT DATE(createdAt) AS day, COUNT(*) AS count FROM `User` WHERE role = 'CUSTOMER' AND createdAt >= ? GROUP BY day ORDER BY day ASC",
    [start]
  );
  const [orderVolume] = await pool.query(
    'SELECT DATE(createdAt) AS day, COUNT(*) AS count FROM `Order` WHERE createdAt >= ? GROUP BY day ORDER BY day ASC',
    [start]
  );

  const toSeries = (rows) => rows.map((r) => ({ day: r.day, count: Number(r.count) }));
  return {
    venueSignups: toSeries(venueSignups),
    customerSignups: toSeries(customerSignups),
    orderVolume: toSeries(orderVolume),
  };
}

async function recentActivityFeed(limit = 20) {
  const activity = await listActivity({ limit });
  const [recentOrders] = await pool.query(
    `SELECT o.id, o.venueId, o.totalAmount, o.createdAt, v.name AS venueName FROM \`Order\` o
     JOIN \`Venue\` v ON v.id = o.venueId ORDER BY o.createdAt DESC LIMIT ?`,
    [limit]
  );
  const [recentVenues] = await pool.query(
    'SELECT id, name, status, createdAt FROM `Venue` ORDER BY createdAt DESC LIMIT ?',
    [limit]
  );
  return { activity, recentOrders, recentVenues };
}

async function dashboard() {
  const [kpiData, growth, feed] = await Promise.all([kpis(), growthSeries(30), recentActivityFeed()]);
  return { kpis: kpiData, growth, feed };
}

// --- Venue lifecycle ---

async function setVenueStatus(venueId, status, reason, actingUserId) {
  await pool.query('UPDATE `Venue` SET status = ?, statusReason = ? WHERE id = ?', [status, reason || null, venueId]);
  const venue = await findById('Venue', venueId);
  await logActivity(venueId, actingUserId, `VENUE_${status}`, 'Venue', venueId, { reason });
  emitToAdmins('venue:statusChanged', venue);
  return venue;
}

// Contractual promotion — a platform admin marks a venue "featured" so it
// gets boosted (but not distance-overriding) placement in discovery lists.
async function setVenueFeatured(venueId, isFeatured, actingUserId) {
  await pool.query('UPDATE `Venue` SET isFeatured = ? WHERE id = ?', [!!isFeatured, venueId]);
  const venue = await findById('Venue', venueId);
  await logActivity(venueId, actingUserId, isFeatured ? 'VENUE_FEATURED' : 'VENUE_UNFEATURED', 'Venue', venueId, {});
  return venue;
}

// --- Customer management ---

async function listCustomers({ search, isSuspended } = {}) {
  const conditions = ["role = 'CUSTOMER'"];
  const params = [];
  if (search) {
    conditions.push('(name LIKE ? OR email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (isSuspended !== undefined) {
    conditions.push('isSuspended = ?');
    params.push(isSuspended);
  }
  const [rows] = await pool.query(
    `SELECT * FROM \`User\` WHERE ${conditions.join(' AND ')} ORDER BY createdAt DESC`,
    params
  );
  return rows.map(sanitizeUser);
}

async function getCustomerDetail(userId) {
  const user = await findById('User', userId);
  if (!user || user.role !== 'CUSTOMER') {
    const err = new Error('مشتری مورد نظر یافت نشد.');
    err.status = 404;
    throw err;
  }
  const [orders] = await pool.query('SELECT * FROM `Order` WHERE customerId = ? ORDER BY createdAt DESC', [userId]);
  const [loyaltyTransactions] = await pool.query(
    'SELECT * FROM `LoyaltyTransaction` WHERE userId = ? ORDER BY createdAt DESC',
    [userId]
  );
  return { ...sanitizeUser(user), orders, loyaltyTransactions };
}

async function setCustomerSuspension(userId, isSuspended, reason, actingUserId) {
  await pool.query('UPDATE `User` SET isSuspended = ?, suspendedAt = ?, suspendReason = ? WHERE id = ?', [
    isSuspended,
    isSuspended ? new Date() : null,
    reason || null,
    userId,
  ]);
  if (isSuspended) {
    await pool.query('UPDATE `RefreshToken` SET revoked = TRUE WHERE userId = ?', [userId]);
  }
  await logActivity(null, actingUserId, isSuspended ? 'CUSTOMER_SUSPENDED' : 'CUSTOMER_REACTIVATED', 'User', userId, {
    reason,
  });
  return sanitizeUser(await findById('User', userId));
}

async function adjustCustomerLoyalty(userId, points, reason, actingUserId) {
  await pool.query('UPDATE `User` SET loyaltyPoints = GREATEST(loyaltyPoints + ?, 0) WHERE id = ?', [points, userId]);
  await pool.query(
    'INSERT INTO `LoyaltyTransaction` (id, userId, type, points, description) VALUES (?, ?, ?, ?, ?)',
    [randomUUID(), userId, 'ADJUST', points, reason || 'اصلاح دستی توسط مدیر پلتفرم']
  );
  await logActivity(null, actingUserId, 'CUSTOMER_LOYALTY_ADJUSTED', 'User', userId, { points, reason });
  return sanitizeUser(await findById('User', userId));
}

// --- Audit log ---

async function platformActivityLog(filters) {
  return listActivity(filters);
}

// --- Security ---

async function forceLogout(userId, actingUserId) {
  await pool.query('UPDATE `RefreshToken` SET revoked = TRUE WHERE userId = ?', [userId]);
  await logActivity(null, actingUserId, 'USER_FORCE_LOGOUT', 'User', userId, null);
}

async function listUserSessions(userId) {
  const [rows] = await pool.query(
    `SELECT id, userAgent, ip, lastUsedAt, createdAt, expiresAt FROM \`RefreshToken\`
     WHERE userId = ? AND revoked = FALSE AND expiresAt > NOW()
     ORDER BY lastUsedAt DESC`,
    [userId]
  );
  return rows;
}

async function listBlockedIps() {
  const [rows] = await pool.query(
    `SELECT b.*, u.name AS createdByName FROM \`BlockedIp\` b
     LEFT JOIN \`User\` u ON u.id = b.createdBy
     WHERE b.expiresAt IS NULL OR b.expiresAt > NOW()
     ORDER BY b.createdAt DESC`
  );
  return rows;
}

async function blockIp({ ip, reason, expiresAt }, actingUserId) {
  const normalized = normalizeIp(ip);
  await pool.query(
    `INSERT INTO \`BlockedIp\` (id, ip, reason, source, createdBy, expiresAt)
     VALUES (?, ?, ?, 'MANUAL', ?, ?)
     ON DUPLICATE KEY UPDATE reason = VALUES(reason), source = 'MANUAL', createdBy = VALUES(createdBy), expiresAt = VALUES(expiresAt)`,
    [randomUUID(), normalized, reason, actingUserId, expiresAt || null]
  );
  await logActivity(null, actingUserId, 'IP_BLOCKED', 'BlockedIp', normalized, { reason, expiresAt });
}

async function unblockIp(id, actingUserId) {
  const [[row]] = await pool.query('SELECT ip FROM `BlockedIp` WHERE id = ?', [id]);
  await pool.query('DELETE FROM `BlockedIp` WHERE id = ?', [id]);
  await logActivity(null, actingUserId, 'IP_UNBLOCKED', 'BlockedIp', row?.ip || id, null);
}

// Global command-palette search across venues and customers. Returns a small,
// typed result set for quick navigation. Uses a parameterized LIKE so it is
// injection-safe; the `%` wildcards are bound as data, not concatenated in.
async function globalSearch(term) {
  const q = (term || '').trim();
  if (q.length < 2) return { venues: [], customers: [] };
  const like = `%${q}%`;

  const [venues] = await pool.query(
    `SELECT id, name, city, status, subscriptionTier
     FROM \`Venue\`
     WHERE name LIKE ? OR city LIKE ?
     ORDER BY name LIMIT 6`,
    [like, like]
  );
  const [customers] = await pool.query(
    `SELECT id, name, email, phone, role
     FROM \`User\`
     WHERE (name LIKE ? OR email LIKE ? OR phone LIKE ?) AND role = 'CUSTOMER'
     ORDER BY createdAt DESC LIMIT 6`,
    [like, like, like]
  );
  return { venues, customers };
}

// Broadcast a platform announcement as an in-app SYSTEM notification to a whole
// audience. Rows are inserted in bulk and each recipient gets a realtime push.
// audience: 'CUSTOMERS' | 'VENUE_OWNERS' | 'ALL'.
async function broadcastAnnouncement({ title, body, audience }, actorId) {
  const cleanTitle = (title || '').trim();
  const cleanBody = (body || '').trim();
  if (!cleanTitle || !cleanBody) {
    const err = new Error('عنوان و متن پیام الزامی است.');
    err.status = 400;
    throw err;
  }
  const roleFilter =
    audience === 'CUSTOMERS'
      ? ["role = 'CUSTOMER'", []]
      : audience === 'VENUE_OWNERS'
      ? ["role = 'VENUE_OWNER'", []]
      : ["role IN ('CUSTOMER', 'VENUE_OWNER')", []];

  const [recipients] = await pool.query(
    `SELECT id FROM \`User\` WHERE ${roleFilter[0]} AND (isSuspended IS NULL OR isSuspended = FALSE)`,
    roleFilter[1]
  );
  if (recipients.length === 0) return { sent: 0 };

  const data = JSON.stringify({ broadcast: true });
  const values = recipients.map((r) => [randomUUID(), r.id, 'SYSTEM', cleanTitle, cleanBody, data]);
  await pool.query(
    'INSERT INTO `Notification` (id, userId, type, title, body, data) VALUES ?',
    [values]
  );

  for (let i = 0; i < recipients.length; i += 1) {
    emitToCustomer(recipients[i].id, 'notification:new', {
      id: values[i][0],
      userId: recipients[i].id,
      type: 'SYSTEM',
      title: cleanTitle,
      body: cleanBody,
      isRead: 0,
      createdAt: new Date().toISOString(),
    });
  }

  await logActivity(null, actorId, 'ANNOUNCE', 'BROADCAST', null, {
    audience,
    title: cleanTitle,
    recipients: recipients.length,
  }).catch(() => {});

  return { sent: recipients.length };
}

async function scheduleBroadcast({ title, body, audience, scheduledAt }, actorId) {
  const cleanTitle = (title || '').trim();
  const cleanBody = (body || '').trim();
  if (!cleanTitle || !cleanBody) {
    const err = new Error('عنوان و متن پیام الزامی است.');
    err.status = 400;
    throw err;
  }
  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime()) || when <= new Date()) {
    const err = new Error('زمان ارسال باید در آینده باشد.');
    err.status = 400;
    throw err;
  }
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `ScheduledBroadcast` (id, title, body, audience, scheduledAt, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
    [id, cleanTitle, cleanBody, audience, when, actorId]
  );
  const [[row]] = await pool.query('SELECT * FROM `ScheduledBroadcast` WHERE id = ?', [id]);
  return row;
}

async function listScheduledBroadcasts() {
  const [rows] = await pool.query('SELECT * FROM `ScheduledBroadcast` ORDER BY scheduledAt DESC LIMIT 50');
  return rows;
}

async function cancelScheduledBroadcast(id) {
  await pool.query("UPDATE `ScheduledBroadcast` SET status = 'CANCELLED' WHERE id = ? AND status = 'PENDING'", [id]);
}

// Polled every minute from server.js — sends any broadcast whose scheduled
// time has arrived. Runs in-process rather than a real cron since this is a
// single-instance deployment; each due row is claimed via its own UPDATE so a
// restart mid-run can't double-send.
async function processDueBroadcasts() {
  const [due] = await pool.query(
    "SELECT * FROM `ScheduledBroadcast` WHERE status = 'PENDING' AND scheduledAt <= NOW()"
  );
  for (const row of due) {
    const [result] = await pool.query(
      "UPDATE `ScheduledBroadcast` SET status = 'SENT', sentAt = NOW() WHERE id = ? AND status = 'PENDING'",
      [row.id]
    );
    if (result.affectedRows === 0) continue; // already claimed
    await broadcastAnnouncement({ title: row.title, body: row.body, audience: row.audience }, row.createdBy).catch(
      (err) => console.error('processDueBroadcasts: failed to send', row.id, err)
    );
  }
}

async function systemHealth() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [[{ errorCount }]] = await pool.query('SELECT COUNT(*) AS errorCount FROM `ApiErrorLog` WHERE createdAt >= ?', [
    since,
  ]);
  const [[{ totalPayments, failedPayments }]] = await pool.query(
    `SELECT COUNT(*) AS totalPayments, SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failedPayments
     FROM \`Payment\` WHERE createdAt >= ?`,
    [since]
  );
  const total = Number(totalPayments) || 0;
  const failed = Number(failedPayments) || 0;

  // Hourly error counts for the last 24h, always 24 buckets (zero-filled) so
  // the frontend can chart it directly with no gap-filling of its own.
  const [errorRows] = await pool.query(
    `SELECT DATE_FORMAT(createdAt, '%Y-%m-%d %H:00') AS hourBucket, COUNT(*) AS c
     FROM \`ApiErrorLog\` WHERE createdAt >= ? GROUP BY hourBucket`,
    [since]
  );
  const errorsByHourMap = new Map(errorRows.map((r) => [r.hourBucket, Number(r.c)]));
  const errorsByHour = [];
  for (let i = 23; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    const key = d.toISOString().slice(0, 13).replace('T', ' ') + ':00';
    errorsByHour.push({ hour: d.getHours(), count: errorsByHourMap.get(key) || 0 });
  }

  return {
    apiErrorsLast24h: Number(errorCount),
    failedPaymentRate: total > 0 ? failed / total : 0,
    connectedSockets: getConnectedClientCount(),
    uptimeSeconds: Math.round(process.uptime()),
    errorsByHour,
  };
}

// Support impersonation: issue a short-lived access token as the venue's
// owner so a platform admin can see exactly what they see, without touching
// the admin's own refresh-token cookie — "end impersonation" is just a normal
// token refresh, which re-derives the admin's own session from that cookie.
// Every impersonation start is written to the activity log with both
// identities so it's fully auditable.
async function impersonateVenueOwner(venueId, adminId) {
  const [[venue]] = await pool.query('SELECT id, name, ownerId FROM `Venue` WHERE id = ?', [venueId]);
  if (!venue) {
    const err = new Error('مجموعه یافت نشد.');
    err.status = 404;
    throw err;
  }
  const [[owner]] = await pool.query('SELECT * FROM `User` WHERE id = ? AND deletedAt IS NULL', [venue.ownerId]);
  if (!owner) {
    const err = new Error('مالک این مجموعه یافت نشد.');
    err.status = 404;
    throw err;
  }
  if (owner.isSuspended) {
    const err = new Error('حساب این مالک مسدود است.');
    err.status = 403;
    throw err;
  }

  const accessToken = signAccessToken(owner, { impersonatedBy: adminId });

  await logActivity(venue.id, adminId, 'IMPERSONATE_START', 'User', owner.id, {
    venueName: venue.name,
    targetName: owner.name,
    targetEmail: owner.email,
  });

  return { accessToken, user: sanitizeUser(owner), venue: { id: venue.id, name: venue.name } };
}

async function listRecentApiErrors(limit = 30) {
  const [rows] = await pool.query(
    'SELECT id, method, path, statusCode, message, createdAt FROM `ApiErrorLog` ORDER BY createdAt DESC LIMIT ?',
    [Number(limit)]
  );
  return rows;
}

module.exports = {
  listUsers,
  updateUserRole,
  listVenuesWithOwners,
  updateVenueSubscription,
  listPendingSubscriptionRequests,
  createPayout,
  markPayoutPaid,
  listAllPayouts,
  platformStats,
  dashboard,
  setVenueStatus,
  setVenueFeatured,
  listCustomers,
  getCustomerDetail,
  setCustomerSuspension,
  adjustCustomerLoyalty,
  platformActivityLog,
  forceLogout,
  listUserSessions,
  listBlockedIps,
  blockIp,
  unblockIp,
  systemHealth,
  listRecentApiErrors,
  impersonateVenueOwner,
  globalSearch,
  broadcastAnnouncement,
  scheduleBroadcast,
  listScheduledBroadcasts,
  cancelScheduledBroadcast,
  processDueBroadcasts,
};
