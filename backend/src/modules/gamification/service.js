const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');

async function getTiers() {
  const [rows] = await pool.query('SELECT * FROM `TierConfig` ORDER BY sortOrder ASC');
  return rows;
}

async function getBadges() {
  const [rows] = await pool.query('SELECT * FROM `BadgeConfig` WHERE isActive = TRUE ORDER BY threshold ASC');
  return rows;
}

async function getCustomerProgress(userId) {
  // Current tier
  const [[tierRow]] = await pool.query(
    `SELECT ct.*, tc.name AS tierName, tc.icon AS tierIcon, tc.pointsMultiplier, tc.perks, tc.minSpend, tc.minOrders
     FROM \`CustomerTier\` ct
     JOIN \`TierConfig\` tc ON tc.id = ct.tierConfigId
     WHERE ct.userId = ?`,
    [userId]
  );

  // All tiers for progress display
  const tiers = await getTiers();

  // Customer stats
  const [[stats]] = await pool.query(
    `SELECT COUNT(*) AS totalOrders,
            COALESCE(SUM(totalAmount), 0) AS totalSpend
     FROM \`Order\`
     WHERE customerId = ? AND paymentStatus = 'SUCCESS'`,
    [userId]
  );

  // Earned badges
  const [earnedBadges] = await pool.query(
    `SELECT cb.earnedAt, bc.*
     FROM \`CustomerBadge\` cb
     JOIN \`BadgeConfig\` bc ON bc.id = cb.badgeConfigId
     WHERE cb.userId = ?`,
    [userId]
  );

  // All active badges for collection view
  const allBadges = await getBadges();

  return {
    currentTier: tierRow || null,
    tiers,
    stats: { totalOrders: Number(stats.totalOrders), totalSpend: Number(stats.totalSpend) },
    earnedBadges,
    allBadges,
  };
}

async function evaluateTier(userId) {
  const [[stats]] = await pool.query(
    `SELECT COUNT(*) AS totalOrders, COALESCE(SUM(totalAmount), 0) AS totalSpend
     FROM \`Order\`
     WHERE customerId = ? AND paymentStatus = 'SUCCESS'`,
    [userId]
  );
  const totalOrders = Number(stats.totalOrders);
  const totalSpend = Number(stats.totalSpend);

  // Highest tier where both minSpend AND minOrders are met
  const [tiers] = await pool.query(
    'SELECT * FROM `TierConfig` ORDER BY sortOrder DESC'
  );
  let bestTier = null;
  for (const tier of tiers) {
    if (totalSpend >= Number(tier.minSpend) && totalOrders >= Number(tier.minOrders)) {
      bestTier = tier;
      break;
    }
  }
  if (!bestTier) return;

  await pool.query(
    'INSERT INTO `CustomerTier` (userId, tierConfigId) VALUES (?, ?) ON DUPLICATE KEY UPDATE tierConfigId = ?, updatedAt = NOW()',
    [userId, bestTier.id, bestTier.id]
  );
}

async function evaluateBadges(userId) {
  const [badges] = await pool.query('SELECT * FROM `BadgeConfig` WHERE isActive = TRUE');
  const [alreadyEarned] = await pool.query('SELECT badgeConfigId FROM `CustomerBadge` WHERE userId = ?', [userId]);
  const earnedIds = new Set(alreadyEarned.map((r) => r.badgeConfigId));

  for (const badge of badges) {
    if (earnedIds.has(badge.id)) continue;

    let met = false;
    const threshold = Number(badge.threshold);

    if (badge.criteriaType === 'TOTAL_ORDERS') {
      const [[r]] = await pool.query(
        "SELECT COUNT(*) AS c FROM `Order` WHERE customerId = ? AND paymentStatus = 'SUCCESS'",
        [userId]
      );
      met = Number(r.c) >= threshold;

    } else if (badge.criteriaType === 'TOTAL_SPEND') {
      const [[r]] = await pool.query(
        "SELECT COALESCE(SUM(totalAmount), 0) AS s FROM `Order` WHERE customerId = ? AND paymentStatus = 'SUCCESS'",
        [userId]
      );
      met = Number(r.s) >= threshold;

    } else if (badge.criteriaType === 'ORDERS_AT_VENUE') {
      // Any single venue with >= threshold orders
      const [[r]] = await pool.query(
        `SELECT MAX(cnt) AS m FROM (
           SELECT COUNT(*) AS cnt FROM \`Order\`
           WHERE customerId = ? AND paymentStatus = 'SUCCESS'
           GROUP BY venueId
         ) t`,
        [userId]
      );
      met = Number(r.m || 0) >= threshold;

    } else if (badge.criteriaType === 'DISTINCT_VENUES') {
      const [[r]] = await pool.query(
        "SELECT COUNT(DISTINCT venueId) AS c FROM `Order` WHERE customerId = ? AND paymentStatus = 'SUCCESS'",
        [userId]
      );
      met = Number(r.c) >= threshold;

    } else if (badge.criteriaType === 'FIRST_ORDER_OF_MONTH') {
      // At least one month where this customer placed the first-ever order at any venue that month
      const [[r]] = await pool.query(
        `SELECT COUNT(*) AS c FROM (
           SELECT DATE_FORMAT(o.createdAt, '%Y-%m') AS ym,
                  MIN(o.createdAt) AS firstInMonth
           FROM \`Order\` o
           WHERE o.customerId = ? AND o.paymentStatus = 'SUCCESS'
           GROUP BY ym
           HAVING firstInMonth = (
             SELECT MIN(o2.createdAt) FROM \`Order\` o2
             WHERE DATE_FORMAT(o2.createdAt, '%Y-%m') = ym
               AND o2.venueId = o.venueId
               AND o2.paymentStatus = 'SUCCESS'
           )
         ) sub`,
        [userId]
      );
      met = Number(r.c) >= threshold;
    }

    if (met) {
      await pool.query(
        'INSERT IGNORE INTO `CustomerBadge` (userId, badgeConfigId) VALUES (?, ?)',
        [userId, badge.id]
      );
    }
  }
}

async function evaluateCustomer(userId) {
  await Promise.all([evaluateTier(userId), evaluateBadges(userId)]);
}

// Admin CRUD
async function createTier(data) {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `TierConfig` (id, name, icon, minSpend, minOrders, pointsMultiplier, perks, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.name, data.icon || 'medal', data.minSpend || 0, data.minOrders || 0, data.pointsMultiplier || 1.0, data.perks ? JSON.stringify(data.perks) : null, data.sortOrder || 0]
  );
  const [[row]] = await pool.query('SELECT * FROM `TierConfig` WHERE id = ?', [id]);
  return row;
}

async function updateTier(id, data) {
  const fields = [];
  const values = [];
  for (const [k, v] of Object.entries(data)) {
    if (['name','icon','minSpend','minOrders','pointsMultiplier','perks','sortOrder'].includes(k)) {
      fields.push(`\`${k}\` = ?`);
      values.push(k === 'perks' ? JSON.stringify(v) : v);
    }
  }
  if (fields.length === 0) return;
  await pool.query(`UPDATE \`TierConfig\` SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
  const [[row]] = await pool.query('SELECT * FROM `TierConfig` WHERE id = ?', [id]);
  return row;
}

async function deleteTier(id) {
  await pool.query('DELETE FROM `TierConfig` WHERE id = ?', [id]);
}

async function createBadge(data) {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `BadgeConfig` (id, name, icon, description, criteriaType, threshold, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.name, data.icon || 'award', data.description, data.criteriaType, data.threshold || 1, data.isActive ?? true]
  );
  const [[row]] = await pool.query('SELECT * FROM `BadgeConfig` WHERE id = ?', [id]);
  return row;
}

async function updateBadge(id, data) {
  const fields = [];
  const values = [];
  for (const [k, v] of Object.entries(data)) {
    if (['name','icon','description','criteriaType','threshold','isActive'].includes(k)) {
      fields.push(`\`${k}\` = ?`);
      values.push(v);
    }
  }
  if (fields.length === 0) return;
  await pool.query(`UPDATE \`BadgeConfig\` SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
  const [[row]] = await pool.query('SELECT * FROM `BadgeConfig` WHERE id = ?', [id]);
  return row;
}

async function deleteBadge(id) {
  await pool.query('DELETE FROM `BadgeConfig` WHERE id = ?', [id]);
}

module.exports = {
  getTiers, getBadges, getCustomerProgress, evaluateCustomer,
  createTier, updateTier, deleteTier,
  createBadge, updateBadge, deleteBadge,
};
