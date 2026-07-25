const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById } = require('../../lib/sqlHelpers');
const { emitToVenue, emitToCustomer, emitToAdmins } = require('../../sockets');
const couponsService = require('../coupons/service');
const loyaltyService = require('../loyalty/service');
const happyHourService = require('../happyHour/service');
const subscriptionService = require('../subscription/service');
const { createNotification } = require('../notifications/service');
const { logActivity, listActivity } = require('../../lib/activityLog');
const { notifyOccupancyChange } = require('../venues/service');

async function attachOrderRelations(orders, { withVenue = false } = {}) {
  if (orders.length === 0) return [];
  const orderIds = orders.map((o) => o.id);
  const placeholders = orderIds.map(() => '?').join(', ');

  const [itemRows] = await pool.query(
    `SELECT oi.*,
            mi.id AS mi_id, mi.venueId AS mi_venueId, mi.categoryId AS mi_categoryId, mi.name AS mi_name,
            mi.description AS mi_description, mi.price AS mi_price, mi.imageUrl AS mi_imageUrl, mi.isAvailable AS mi_isAvailable,
            c.id AS c_id, c.name AS c_name, c.description AS c_description, c.price AS c_price, c.imageUrl AS c_imageUrl
     FROM \`OrderItem\` oi
     LEFT JOIN \`MenuItem\` mi ON mi.id = oi.menuItemId
     LEFT JOIN \`Combo\` c ON c.id = oi.comboId
     WHERE oi.orderId IN (${placeholders})`,
    orderIds
  );

  const [payments] = await pool.query(`SELECT * FROM \`Payment\` WHERE orderId IN (${placeholders})`, orderIds);

  const tableIds = [...new Set(orders.map((o) => o.tableId).filter(Boolean))];
  let tables = [];
  if (tableIds.length > 0) {
    const tablePlaceholders = tableIds.map(() => '?').join(', ');
    [tables] = await pool.query(`SELECT * FROM \`VenueTable\` WHERE id IN (${tablePlaceholders})`, tableIds);
  }

  let venues = [];
  if (withVenue) {
    const venueIds = [...new Set(orders.map((o) => o.venueId))];
    const venuePlaceholders = venueIds.map(() => '?').join(', ');
    [venues] = await pool.query(`SELECT * FROM \`Venue\` WHERE id IN (${venuePlaceholders})`, venueIds);
  }

  const itemsByOrder = new Map();
  for (const row of itemRows) {
    const item = {
      id: row.id,
      orderId: row.orderId,
      menuItemId: row.menuItemId,
      comboId: row.comboId,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      subtotal: row.subtotal,
      variantSelections: row.variantSelections || null,
      addedByLabel: row.addedByLabel || null,
      menuItem: row.mi_id
        ? {
            id: row.mi_id,
            venueId: row.mi_venueId,
            categoryId: row.mi_categoryId,
            name: row.mi_name,
            description: row.mi_description,
            price: row.mi_price,
            imageUrl: row.mi_imageUrl,
            isAvailable: !!row.mi_isAvailable,
          }
        : null,
      combo: row.c_id
        ? { id: row.c_id, name: row.c_name, description: row.c_description, price: row.c_price, imageUrl: row.c_imageUrl }
        : null,
    };
    if (!itemsByOrder.has(row.orderId)) itemsByOrder.set(row.orderId, []);
    itemsByOrder.get(row.orderId).push(item);
  }

  const paymentsByOrder = new Map();
  for (const payment of payments) {
    if (!paymentsByOrder.has(payment.orderId)) paymentsByOrder.set(payment.orderId, []);
    paymentsByOrder.get(payment.orderId).push(payment);
  }

  const tableById = new Map(tables.map((t) => [t.id, t]));
  const venueById = new Map(venues.map((v) => [v.id, v]));

  return orders.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) || [],
    payments: paymentsByOrder.get(order.id) || [],
    table: order.tableId ? tableById.get(order.tableId) || null : null,
    ...(withVenue ? { venue: venueById.get(order.venueId) || null } : {}),
  }));
}

async function resolveModifierSelections(menuItemId, modifierSelections) {
  if (!modifierSelections || modifierSelections.length === 0) {
    // Still need to check required groups have defaults.
    const [junctionRows] = await pool.query(
      `SELECT mg.id, mg.name, mg.isRequired, mg.minSelections, mg.type
       FROM \`MenuItemModifier\` mim
       JOIN \`ModifierGroup\` mg ON mg.id = mim.groupId
       WHERE mim.menuItemId = ?`,
      [menuItemId]
    );
    for (const group of junctionRows) {
      if (group.isRequired && group.minSelections > 0) {
        const err = new Error(`انتخاب گزینه‌ای از «${group.name}» الزامی است.`);
        err.status = 400;
        throw err;
      }
    }
    return { priceAdjustment: 0, snapshot: null };
  }

  // Collect all unique groupIds + optionIds referenced.
  const groupIds = [...new Set(modifierSelections.map((s) => s.groupId))];
  const optionIds = modifierSelections.flatMap((s) => s.optionIds || (s.optionId ? [s.optionId] : []));

  if (groupIds.length === 0) return { priceAdjustment: 0, snapshot: null };

  const gPlaceholders = groupIds.map(() => '?').join(', ');
  const [groups] = await pool.query(
    `SELECT mg.*, mim.menuItemId FROM \`ModifierGroup\` mg
     JOIN \`MenuItemModifier\` mim ON mim.groupId = mg.id
     WHERE mg.id IN (${gPlaceholders}) AND mim.menuItemId = ?`,
    [...groupIds, menuItemId]
  );

  const [allItemGroups] = await pool.query(
    `SELECT mg.id, mg.isRequired, mg.minSelections FROM \`ModifierGroup\` mg
     JOIN \`MenuItemModifier\` mim ON mim.groupId = mg.id WHERE mim.menuItemId = ?`,
    [menuItemId]
  );

  const oPlaceholders = optionIds.length > 0 ? optionIds.map(() => '?').join(', ') : null;
  const options = oPlaceholders
    ? (await pool.query(`SELECT * FROM \`ModifierOption\` WHERE id IN (${oPlaceholders})`, optionIds))[0]
    : [];

  const groupById = new Map(groups.map((g) => [g.id, g]));
  const optionById = new Map(options.map((o) => [o.id, o]));

  const snapshot = [];
  let priceAdjustment = 0;
  const satisfiedGroupIds = new Set();

  for (const sel of modifierSelections) {
    const group = groupById.get(sel.groupId);
    if (!group) {
      const err = new Error('یک گروه سفارشی‌سازی انتخاب‌شده معتبر نیست.');
      err.status = 400;
      throw err;
    }
    const selectedOptionIds = sel.optionIds || (sel.optionId ? [sel.optionId] : []);

    if (group.maxSelections !== null && selectedOptionIds.length > group.maxSelections) {
      const err = new Error(`حداکثر ${group.maxSelections} گزینه از «${group.name}» انتخاب کنید.`);
      err.status = 400;
      throw err;
    }
    if (selectedOptionIds.length < (group.minSelections || 0)) {
      const err = new Error(`حداقل ${group.minSelections} گزینه از «${group.name}» الزامی است.`);
      err.status = 400;
      throw err;
    }

    for (const optId of selectedOptionIds) {
      const opt = optionById.get(optId);
      if (!opt || opt.groupId !== sel.groupId) {
        const err = new Error('یک گزینه انتخاب‌شده معتبر نیست.');
        err.status = 400;
        throw err;
      }
      priceAdjustment += Number(opt.priceAdjustment || 0);
      snapshot.push({
        groupId: group.id,
        groupName: group.name,
        optionId: opt.id,
        optionName: opt.name,
        priceAdjustment: Number(opt.priceAdjustment || 0),
      });
    }
    satisfiedGroupIds.add(sel.groupId);
  }

  // Check required groups that got no selection.
  for (const ig of allItemGroups) {
    if (ig.isRequired && ig.minSelections > 0 && !satisfiedGroupIds.has(ig.id)) {
      const [gRow] = await pool.query('SELECT name FROM `ModifierGroup` WHERE id = ?', [ig.id]);
      const err = new Error(`انتخاب گزینه‌ای از «${gRow[0]?.name || ig.id}» الزامی است.`);
      err.status = 400;
      throw err;
    }
  }

  return { priceAdjustment, snapshot: snapshot.length > 0 ? snapshot : null };
}

async function resolveOrderItems(items) {
  const menuItemIds = items.filter((i) => i.menuItemId).map((i) => i.menuItemId);
  const comboIds = items.filter((i) => i.comboId).map((i) => i.comboId);

  const menuItemMap = new Map();
  if (menuItemIds.length > 0) {
    const placeholders = menuItemIds.map(() => '?').join(', ');
    const [rows] = await pool.query(`SELECT * FROM \`MenuItem\` WHERE id IN (${placeholders})`, menuItemIds);
    rows.forEach((row) => menuItemMap.set(row.id, row));
  }

  const comboMap = new Map();
  if (comboIds.length > 0) {
    const placeholders = comboIds.map(() => '?').join(', ');
    const [rows] = await pool.query(`SELECT * FROM \`Combo\` WHERE id IN (${placeholders})`, comboIds);
    rows.forEach((row) => comboMap.set(row.id, row));
  }

  let subtotal = 0;
  const resolved = [];
  for (const item of items) {
    if (item.menuItemId) {
      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem) {
        const err = new Error('یکی از اقلام منو یافت نشد.');
        err.status = 400;
        throw err;
      }
      // modifierSelections is the new field; fall back to legacy variantSelections for backward compat.
      const modSels = item.modifierSelections || item.variantSelections || null;
      const { priceAdjustment, snapshot } = await resolveModifierSelections(item.menuItemId, modSels);
      const unitPrice = Number(menuItem.price) + priceAdjustment;
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;
      resolved.push({
        menuItemId: item.menuItemId,
        comboId: null,
        quantity: item.quantity,
        unitPrice,
        subtotal: itemSubtotal,
        variantSelections: snapshot,
        addedByLabel: item.addedByLabel || null,
      });
      continue;
    }

    if (item.comboId) {
      const combo = comboMap.get(item.comboId);
      if (!combo) {
        const err = new Error('یکی از کمبوهای انتخابی یافت نشد.');
        err.status = 400;
        throw err;
      }
      const unitPrice = Number(combo.price);
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;
      resolved.push({
        menuItemId: null,
        comboId: item.comboId,
        quantity: item.quantity,
        unitPrice,
        subtotal: itemSubtotal,
        variantSelections: null,
        addedByLabel: item.addedByLabel || null,
      });
      continue;
    }

    const err = new Error('هر آیتم سفارش باید شناسه منو یا کمبو داشته باشد.');
    err.status = 400;
    throw err;
  }

  return { resolved, subtotal };
}

async function createOrder({ venueId, tableId, customerId, items, couponCode, redeemPoints, punchCardId, isPickup = false }) {
  const { resolved: orderItemsData, subtotal } = await resolveOrderItems(items);

  const venue = await findById('Venue', venueId);
  if (!venue) {
    const err = new Error('مجموعه مورد نظر یافت نشد.');
    err.status = 404;
    throw err;
  }
  if (venue.status !== 'ACTIVE') {
    const err = new Error('این مجموعه در حال حاضر امکان ثبت سفارش ندارد.');
    err.status = 400;
    throw err;
  }
  if (venue.isTemporarilyClosed) {
    const err = new Error(venue.temporarilyClosedReason || 'این مجموعه امروز موقتاً سفارش نمی‌پذیرد.');
    err.status = 400;
    throw err;
  }
  if (isPickup && !venue.acceptsPickup) {
    const err = new Error('این مجموعه سفارش پیک‌آپ (بیرون‌بر) نمی‌پذیرد.');
    err.status = 400;
    throw err;
  }

  const orderId = randomUUID();
  const connection = await pool.getConnection();
  let discountAmount = 0;
  let couponId = null;

  try {
    await connection.beginTransaction();

    // Insert the order first (provisional totals) so coupon/loyalty redemption
    // rows — which carry a foreign key to Order.id — have a row to reference.
    await connection.query(
      `INSERT INTO \`Order\` (id, venueId, tableId, customerId, isPickup, status, paymentStatus, totalAmount, discountAmount, commissionAmount, couponId)
       VALUES (?, ?, ?, ?, ?, 'PENDING', 'PENDING', ?, 0, 0, NULL)`,
      [orderId, venueId, tableId || null, customerId || null, Boolean(isPickup && !tableId), subtotal]
    );

    for (const item of orderItemsData) {
      await connection.query(
        `INSERT INTO \`OrderItem\` (id, orderId, menuItemId, comboId, quantity, unitPrice, subtotal, variantSelections, addedByLabel)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          orderId,
          item.menuItemId,
          item.comboId,
          item.quantity,
          item.unitPrice,
          item.subtotal,
          item.variantSelections ? JSON.stringify(item.variantSelections) : null,
          item.addedByLabel || null,
        ]
      );
    }

    // Happy hour is automatic (no code) and evaluated server-side at the
    // moment of order creation — never trust a client-asserted discount.
    let discountReason = null;
    const happyHourRule = await happyHourService.getActiveRule(venueId);
    if (happyHourRule) {
      const happyHourDiscount = Math.round((subtotal * Number(happyHourRule.discountPercent)) / 100);
      discountAmount += happyHourDiscount;
      discountReason = `ساعت شاد «${happyHourRule.name}» — ${Number(happyHourRule.discountPercent)}٪ تخفیف`;
    }

    // Subscribers get one random weighted discount per order (see
    // subscription/discountRoll.js) — rolled and logged server-side so it
    // can never be spoofed or requested by the client.
    const subscriptionDiscountPercent = await subscriptionService.rollDiscountForOrder(connection, customerId, orderId);
    if (subscriptionDiscountPercent) {
      const subscriptionDiscount = Math.round((subtotal * subscriptionDiscountPercent) / 100);
      discountAmount += subscriptionDiscount;
      const subReason = `تخفیف اشتراک ${subscriptionDiscountPercent}٪`;
      discountReason = discountReason ? `${discountReason} + ${subReason}` : subReason;
    }

    if (couponCode) {
      const { coupon, discountAmount: couponDiscount } = await couponsService.validateCoupon(
        connection,
        couponCode.trim().toUpperCase(),
        venueId,
        subtotal
      );
      discountAmount += couponDiscount;
      couponId = coupon.id;
      await couponsService.redeemCouponInTransaction(connection, couponId, orderId, customerId);
    }

    if (redeemPoints && customerId) {
      const pointsDiscount = await loyaltyService.redeemPointsInTransaction(
        connection,
        customerId,
        redeemPoints,
        venueId,
        orderId
      );
      discountAmount += pointsDiscount;
    }

    if (punchCardId && customerId) {
      const { discountAmount: punchCardDiscount } = await require('../punchCards/service').redeemForOrder(
        connection,
        customerId,
        punchCardId,
        orderId,
        orderItemsData
      );
      discountAmount += punchCardDiscount;
      const punchReason = 'استفاده از بسته پیش‌پرداخت';
      discountReason = discountReason ? `${discountReason} + ${punchReason}` : punchReason;
    }

    const totalAmount = Math.max(subtotal - discountAmount, 0);
    const commissionAmount = (totalAmount * Number(venue.commissionRate)) / 100;

    await connection.query(
      'UPDATE `Order` SET totalAmount = ?, discountAmount = ?, discountReason = ?, commissionAmount = ?, couponId = ? WHERE id = ?',
      [totalAmount, discountAmount, discountReason, commissionAmount, couponId, orderId]
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  const order = await getOrder(orderId);
  emitToVenue(venueId, 'order:new', order);
  emitToCustomer(customerId, 'order:new', order);
  emitToAdmins('order:new', order);
  notifyOccupancyChange(venueId);
  // Fire-and-forget: deduct raw material stock if venue has inventory enabled.
  require('../inventory/service').deductStockForOrder(orderId, venueId).catch(() => {});
  require('../webhooks/service').triggerEvent(venueId, 'order.created', order).catch(() => {});
  return order;
}

async function listOrdersForVenue(venueId, { status, tableId, from, to } = {}) {
  const params = [venueId];
  let query = 'SELECT * FROM `Order` WHERE venueId = ?';
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (tableId) {
    query += ' AND tableId = ?';
    params.push(tableId);
  }
  if (from) {
    query += ' AND createdAt >= ?';
    params.push(new Date(from));
  }
  if (to) {
    query += ' AND createdAt <= ?';
    params.push(new Date(to));
  }
  query += ' ORDER BY createdAt DESC';

  const [orders] = await pool.query(query, params);
  return attachOrderRelations(orders);
}

async function listOrdersForCustomer(customerId, { venueId, status, from, to } = {}) {
  const params = [customerId];
  let query = 'SELECT * FROM `Order` WHERE customerId = ?';
  if (venueId) {
    query += ' AND venueId = ?';
    params.push(venueId);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (from) {
    query += ' AND createdAt >= ?';
    params.push(new Date(from));
  }
  if (to) {
    query += ' AND createdAt <= ?';
    params.push(new Date(to));
  }
  query += ' ORDER BY createdAt DESC';

  const [orders] = await pool.query(query, params);
  return attachOrderRelations(orders, { withVenue: true });
}

const DEFAULT_PREP_MINUTES = 15;
const MIN_HISTORY_SAMPLE = 5;
const QUEUE_MINUTES_PER_ORDER = 3;

// Estimates how many more minutes until this order is likely to reach READY,
// based on this venue's own historical prep durations (not a fixed number for
// every cafe) plus how many orders are already queued ahead of it. Falls back
// to a flat default until the venue has enough completed-order history.
async function estimatePrepMinutes(venueId, order) {
  const [[historyRow]] = await pool.query(
    `SELECT AVG(diffMinutes) AS avgMinutes, COUNT(*) AS sampleSize FROM (
       SELECT TIMESTAMPDIFF(MINUTE, o.createdAt, a.createdAt) AS diffMinutes
       FROM \`Order\` o
       JOIN \`ActivityLog\` a ON a.entityId = o.id AND a.entityType = 'Order' AND a.action = 'ORDER_STATUS_UPDATED'
         AND JSON_UNQUOTE(JSON_EXTRACT(a.details, '$.status')) = 'READY'
       WHERE o.venueId = ? AND o.id != ?
       ORDER BY o.createdAt DESC
       LIMIT 50
     ) t`,
    [venueId, order.id]
  );

  const sampleSize = Number(historyRow.sampleSize) || 0;
  const basedOnHistory = sampleSize >= MIN_HISTORY_SAMPLE;
  const baseMinutes = basedOnHistory ? Number(historyRow.avgMinutes) : DEFAULT_PREP_MINUTES;

  const [[{ queueAhead }]] = await pool.query(
    "SELECT COUNT(*) AS queueAhead FROM `Order` WHERE venueId = ? AND status IN ('PENDING', 'PREPARING') AND createdAt < ?",
    [venueId, order.createdAt]
  );

  const elapsedMinutes = Math.max(0, Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000));
  const totalEstimate = Math.max(1, Math.round(baseMinutes + Number(queueAhead) * QUEUE_MINUTES_PER_ORDER));
  const remainingMinutes = Math.max(1, totalEstimate - elapsedMinutes);

  return { estimatedMinutes: remainingMinutes, basedOnHistory, sampleSize };
}

async function getOrder(id) {
  const order = await findById('Order', id);
  if (!order) {
    const err = new Error('سفارش یافت نشد.');
    err.status = 404;
    throw err;
  }
  const [withRelations] = await attachOrderRelations([order], { withVenue: true });

  if (['PENDING', 'PREPARING'].includes(withRelations.status)) {
    withRelations.prepEstimate = await estimatePrepMinutes(withRelations.venueId, withRelations);
  }

  return withRelations;
}

const STATUS_LABELS_FA = {
  PENDING: 'در انتظار',
  PREPARING: 'در حال آماده‌سازی',
  READY: 'آماده سرو',
  SERVED: 'سرو شده',
  CANCELLED: 'لغو شده',
};

async function updateOrderStatus(id, status, actingUserId = null) {
  await pool.query('UPDATE `Order` SET status = ? WHERE id = ?', [status, id]);
  const order = await findById('Order', id);
  emitToVenue(order.venueId, 'order:updated', order);
  emitToCustomer(order.customerId, 'order:updated', order);
  require('../webhooks/service').triggerEvent(order.venueId, 'order.statusChanged', order).catch(() => {});

  await logActivity(order.venueId, actingUserId, 'ORDER_STATUS_UPDATED', 'Order', order.id, { status });

  if (order.customerId) {
    await createNotification(
      order.customerId,
      'ORDER_STATUS',
      'وضعیت سفارش شما تغییر کرد',
      `سفارش شما اکنون در وضعیت «${STATUS_LABELS_FA[status] || status}» است.`,
      { orderId: order.id }
    );
  }

  return order;
}

async function updatePaymentStatus(id, paymentStatus) {
  await pool.query('UPDATE `Order` SET paymentStatus = ? WHERE id = ?', [paymentStatus, id]);
  const order = await findById('Order', id);
  emitToVenue(order.venueId, 'order:updated', order);
  emitToCustomer(order.customerId, 'order:updated', order);
  notifyOccupancyChange(order.venueId);
  return order;
}

async function getReorderPayload(id) {
  const order = await getOrder(id);
  return {
    venueId: order.venueId,
    items: order.items.map((item) => ({
      menuItemId: item.menuItemId,
      comboId: item.comboId,
      quantity: item.quantity,
    })),
  };
}

function assertEditable(order) {
  if (order.paymentStatus !== 'PENDING') {
    const err = new Error('امکان ویرایش سفارشی که پرداخت شده وجود ندارد.');
    err.status = 400;
    throw err;
  }
}

async function updateOrderItems(id, items, actingUserId) {
  const order = await getOrder(id);
  assertEditable(order);

  const { resolved, subtotal } = await resolveOrderItems(items);
  const totalAmount = Math.max(subtotal - Number(order.discountAmount), 0);
  const venue = await findById('Venue', order.venueId);
  const commissionAmount = (totalAmount * Number(venue.commissionRate)) / 100;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM `OrderItem` WHERE orderId = ?', [id]);
    for (const item of resolved) {
      await connection.query(
        `INSERT INTO \`OrderItem\` (id, orderId, menuItemId, comboId, quantity, unitPrice, subtotal, variantSelections)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          id,
          item.menuItemId,
          item.comboId,
          item.quantity,
          item.unitPrice,
          item.subtotal,
          item.variantSelections ? JSON.stringify(item.variantSelections) : null,
        ]
      );
    }
    await connection.query('UPDATE `Order` SET totalAmount = ?, commissionAmount = ? WHERE id = ?', [
      totalAmount,
      commissionAmount,
      id,
    ]);
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  await logActivity(order.venueId, actingUserId, 'ORDER_ITEMS_EDITED', 'Order', id, {
    before: order.items.map((i) => ({ menuItemId: i.menuItemId, comboId: i.comboId, quantity: i.quantity })),
    after: items,
  });

  const updated = await getOrder(id);
  emitToVenue(order.venueId, 'order:updated', updated);
  emitToCustomer(order.customerId, 'order:updated', updated);
  return updated;
}

async function updateOrderDiscount(id, discountAmount, discountReason, actingUserId) {
  const order = await getOrder(id);
  assertEditable(order);

  const subtotal = order.items.reduce((sum, item) => sum + Number(item.subtotal), 0);
  const finalDiscount = Math.max(Number(discountAmount) || 0, 0);
  const totalAmount = Math.max(subtotal - finalDiscount, 0);
  const venue = await findById('Venue', order.venueId);
  const commissionAmount = (totalAmount * Number(venue.commissionRate)) / 100;

  await pool.query(
    'UPDATE `Order` SET discountAmount = ?, discountReason = ?, totalAmount = ?, commissionAmount = ? WHERE id = ?',
    [finalDiscount, discountReason || null, totalAmount, commissionAmount, id]
  );

  await logActivity(order.venueId, actingUserId, 'ORDER_DISCOUNT_APPLIED', 'Order', id, {
    discountAmount: finalDiscount,
    discountReason,
  });

  const updated = await getOrder(id);
  emitToVenue(order.venueId, 'order:updated', updated);
  emitToCustomer(order.customerId, 'order:updated', updated);
  return updated;
}

async function voidOrder(id, reason, actingUserId) {
  const order = await getOrder(id);
  const wasPaid = order.paymentStatus === 'SUCCESS';

  await pool.query('UPDATE `Order` SET status = ?, paymentStatus = ?, voidReason = ? WHERE id = ?', [
    'CANCELLED',
    wasPaid ? 'REFUNDED' : order.paymentStatus,
    reason || null,
    id,
  ]);

  if (wasPaid) {
    await loyaltyService.reverseEarnedPointsForOrder(id);
    if (order.customerId && Number(order.walletAmountUsed) > 0) {
      const { refundToWallet } = require('../wallet/service');
      await refundToWallet(order.customerId, Number(order.walletAmountUsed), id).catch(() => {});
    }
  }

  await logActivity(order.venueId, actingUserId, 'ORDER_VOIDED', 'Order', id, { reason, wasPaid });

  const updated = await getOrder(id);
  emitToVenue(order.venueId, 'order:updated', updated);
  emitToCustomer(order.customerId, 'order:updated', updated);
  require('../webhooks/service').triggerEvent(order.venueId, 'order.voided', updated).catch(() => {});
  notifyOccupancyChange(order.venueId);

  if (order.customerId) {
    await createNotification(
      order.customerId,
      'ORDER_STATUS',
      'سفارش شما لغو شد',
      wasPaid ? 'سفارش شما لغو و مبلغ پرداختی بازگردانده شد.' : 'سفارش شما لغو شد.',
      { orderId: id }
    );
  }

  return updated;
}

// Customer self-service cancellation — deliberately narrower than the
// staff-side voidOrder: only the order's own customer can call it, and only
// while the venue hasn't accepted it yet (status still PENDING). Once staff
// moves it to PREPARING the button on the client disappears and this throws,
// since the kitchen may already be acting on it.
async function cancelOwnOrder(userId, id) {
  const order = await getOrder(id);
  if (!order.customerId || order.customerId !== userId) {
    const err = new Error('سفارش مورد نظر یافت نشد.');
    err.status = 404;
    throw err;
  }
  if (order.status !== 'PENDING') {
    const err = new Error('کافه سفارش شما را تایید کرده و دیگر امکان لغو آن نیست.');
    err.status = 400;
    throw err;
  }

  const wasPaid = order.paymentStatus === 'SUCCESS';
  await pool.query('UPDATE `Order` SET status = ?, paymentStatus = ? WHERE id = ?', [
    'CANCELLED',
    wasPaid ? 'REFUNDED' : order.paymentStatus,
    id,
  ]);

  if (wasPaid) {
    await loyaltyService.reverseEarnedPointsForOrder(id);
    if (Number(order.walletAmountUsed) > 0) {
      const { refundToWallet } = require('../wallet/service');
      await refundToWallet(userId, Number(order.walletAmountUsed), id).catch(() => {});
    }
  }

  await logActivity(order.venueId, userId, 'ORDER_CANCELLED_BY_CUSTOMER', 'Order', id, { wasPaid });

  const updated = await getOrder(id);
  emitToVenue(order.venueId, 'order:updated', updated);
  emitToCustomer(userId, 'order:updated', updated);
  require('../webhooks/service').triggerEvent(order.venueId, 'order.voided', updated).catch(() => {});
  notifyOccupancyChange(order.venueId);

  return updated;
}

async function getOrderActivity(id) {
  const order = await findById('Order', id);
  if (!order) {
    const err = new Error('سفارش یافت نشد.');
    err.status = 404;
    throw err;
  }
  const activity = await listActivity({ venueId: order.venueId, limit: 500 });
  return activity.filter((entry) => entry.entityId === id);
}

module.exports = {
  createOrder,
  listOrdersForVenue,
  listOrdersForCustomer,
  getOrder,
  updateOrderStatus,
  updatePaymentStatus,
  getReorderPayload,
  updateOrderItems,
  updateOrderDiscount,
  voidOrder,
  cancelOwnOrder,
  getOrderActivity,
};
