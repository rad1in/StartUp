const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, updateById } = require('../../lib/sqlHelpers');
const { spendFromWallet } = require('../wallet/service');

async function listPlansForOwner(venueId) {
  const [rows] = await pool.query(
    'SELECT p.*, mi.name AS menuItemName FROM `VenuePunchCardPlan` p LEFT JOIN `MenuItem` mi ON mi.id = p.menuItemId WHERE p.venueId = ? ORDER BY p.createdAt DESC',
    [venueId]
  );
  return rows;
}

async function listActivePlansForCustomers(venueId) {
  const [rows] = await pool.query(
    'SELECT p.*, mi.name AS menuItemName, mi.imageUrl AS menuItemImage FROM `VenuePunchCardPlan` p LEFT JOIN `MenuItem` mi ON mi.id = p.menuItemId WHERE p.venueId = ? AND p.isActive = TRUE ORDER BY p.createdAt DESC',
    [venueId]
  );
  return rows;
}

async function createPlan(venueId, { name, menuItemId, totalCredits, price }) {
  if (!name || !menuItemId || !totalCredits || totalCredits < 2 || price == null || price <= 0) {
    const err = new Error('اطلاعات بسته نامعتبر است (نام، آیتم منو، تعداد و قیمت الزامی است).');
    err.status = 400;
    throw err;
  }
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `VenuePunchCardPlan` (id, venueId, menuItemId, name, totalCredits, price) VALUES (?, ?, ?, ?, ?, ?)',
    [id, venueId, menuItemId, name, totalCredits, price]
  );
  return findById('VenuePunchCardPlan', id);
}

async function updatePlan(venueId, planId, data) {
  const plan = await findById('VenuePunchCardPlan', planId);
  if (!plan || plan.venueId !== venueId) {
    const err = new Error('بسته مورد نظر یافت نشد.');
    err.status = 404;
    throw err;
  }
  return updateById('VenuePunchCardPlan', planId, data, ['name', 'totalCredits', 'price', 'isActive']);
}

async function purchasePlan(userId, planId) {
  const [[plan]] = await pool.query('SELECT * FROM `VenuePunchCardPlan` WHERE id = ? AND isActive = TRUE', [planId]);
  if (!plan) {
    const err = new Error('بسته مورد نظر یافت نشد یا غیرفعال است.');
    err.status = 404;
    throw err;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await spendFromWallet(connection, userId, Number(plan.price), null, `خرید بسته «${plan.name}»`);

    const id = randomUUID();
    await connection.query(
      'INSERT INTO `VenueCustomerPunchCard` (id, planId, userId, venueId, remainingCredits) VALUES (?, ?, ?, ?, ?)',
      [id, planId, userId, plan.venueId, plan.totalCredits]
    );

    await connection.commit();
    return findById('VenueCustomerPunchCard', id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function listMyCards(userId) {
  const [rows] = await pool.query(
    `SELECT c.*, p.name AS planName, p.totalCredits, p.menuItemId, mi.name AS menuItemName, v.name AS venueName, v.logoUrl AS venueLogoUrl
     FROM \`VenueCustomerPunchCard\` c
     JOIN \`VenuePunchCardPlan\` p ON p.id = c.planId
     JOIN \`Venue\` v ON v.id = c.venueId
     LEFT JOIN \`MenuItem\` mi ON mi.id = p.menuItemId
     WHERE c.userId = ? AND c.remainingCredits > 0
     ORDER BY c.purchasedAt DESC`,
    [userId]
  );
  return rows;
}

async function listMyCardsForVenue(userId, venueId) {
  const [rows] = await pool.query(
    `SELECT c.*, p.name AS planName, p.totalCredits, p.menuItemId
     FROM \`VenueCustomerPunchCard\` c
     JOIN \`VenuePunchCardPlan\` p ON p.id = c.planId
     WHERE c.userId = ? AND c.venueId = ? AND c.remainingCredits > 0
     ORDER BY c.purchasedAt DESC`,
    [userId, venueId]
  );
  return rows;
}

// Called from orders/service.js during order creation. Matches the card's
// plan against whichever order line has the same menu item, redeems as many
// credits as that line's quantity (capped by remaining balance), and returns
// the resulting discount so the caller can apply it the same way a coupon or
// loyalty-points redemption would be.
async function redeemForOrder(connection, userId, customerCardId, orderId, orderItemsData) {
  const [[card]] = await connection.query(
    `SELECT c.*, p.menuItemId AS planMenuItemId FROM \`VenueCustomerPunchCard\` c
     JOIN \`VenuePunchCardPlan\` p ON p.id = c.planId
     WHERE c.id = ? AND c.userId = ? FOR UPDATE`,
    [customerCardId, userId]
  );
  if (!card) {
    const err = new Error('بسته پیش‌پرداخت یافت نشد.');
    err.status = 404;
    throw err;
  }

  const targetItem = orderItemsData.find((i) => i.menuItemId === card.planMenuItemId);
  if (!targetItem) {
    const err = new Error('این بسته با هیچ‌کدام از آیتم‌های سفارش مطابقت ندارد.');
    err.status = 400;
    throw err;
  }

  const creditsToUse = Math.min(card.remainingCredits, targetItem.quantity);
  if (creditsToUse <= 0) {
    const err = new Error('اعتبار این بسته تمام شده است.');
    err.status = 400;
    throw err;
  }

  await connection.query('UPDATE `VenueCustomerPunchCard` SET remainingCredits = remainingCredits - ? WHERE id = ?', [
    creditsToUse,
    customerCardId,
  ]);
  await connection.query(
    'INSERT INTO `PunchCardRedemption` (id, customerCardId, orderId, creditsUsed) VALUES (?, ?, ?, ?)',
    [randomUUID(), customerCardId, orderId, creditsToUse]
  );

  return { creditsUsed: creditsToUse, discountAmount: creditsToUse * Number(targetItem.unitPrice) };
}

module.exports = {
  listPlansForOwner,
  listActivePlansForCustomers,
  createPlan,
  updatePlan,
  purchasePlan,
  listMyCards,
  listMyCardsForVenue,
  redeemForOrder,
};
