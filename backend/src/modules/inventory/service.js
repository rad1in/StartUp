const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, updateById, deleteById } = require('../../lib/sqlHelpers');

// --- Raw Materials ---

async function listMaterials(venueId) {
  const [rows] = await pool.query(
    `SELECT rm.*, s.name AS supplierName
     FROM \`RawMaterial\` rm
     LEFT JOIN \`Supplier\` s ON s.id = rm.supplierId
     WHERE rm.venueId = ?
     ORDER BY rm.name ASC`,
    [venueId]
  );
  return rows;
}

async function createMaterial(venueId, { name, unit, currentStock, reorderThreshold, costPerUnit, supplierId }) {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `RawMaterial` (id, venueId, name, unit, currentStock, reorderThreshold, costPerUnit, supplierId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, venueId, name, unit, currentStock || 0, reorderThreshold || 0, costPerUnit || 0, supplierId || null]
  );
  return findById('RawMaterial', id);
}

async function updateMaterial(id, data) {
  return updateById('RawMaterial', id, data, ['name', 'unit', 'reorderThreshold', 'costPerUnit', 'supplierId']);
}

async function deleteMaterial(id) {
  return deleteById('RawMaterial', id);
}

async function listLowStock(venueId) {
  const [rows] = await pool.query(
    'SELECT * FROM `RawMaterial` WHERE venueId = ? AND currentStock <= reorderThreshold ORDER BY (currentStock / GREATEST(reorderThreshold, 0.001)) ASC',
    [venueId]
  );
  return rows;
}

// --- Recipes ---

async function listRecipes(venueId) {
  const [rows] = await pool.query(
    `SELECT ri.*, rm.name AS materialName, rm.unit, mi.name AS menuItemName, mo.name AS optionName
     FROM \`RecipeItem\` ri
     JOIN \`RawMaterial\` rm ON rm.id = ri.rawMaterialId
     LEFT JOIN \`MenuItem\` mi ON mi.id = ri.menuItemId
     LEFT JOIN \`ModifierOption\` mo ON mo.id = ri.modifierOptionId
     WHERE rm.venueId = ?
     ORDER BY mi.name ASC, mo.name ASC`,
    [venueId]
  );
  return rows;
}

async function getRecipesForMenuItem(menuItemId) {
  const [rows] = await pool.query(
    `SELECT ri.*, rm.name AS materialName, rm.unit, rm.currentStock
     FROM \`RecipeItem\` ri
     JOIN \`RawMaterial\` rm ON rm.id = ri.rawMaterialId
     WHERE ri.menuItemId = ?`,
    [menuItemId]
  );
  return rows;
}

// Profit margin per menu item, computed from its recipe's raw-material cost.
// Items with no recipe defined yet show cost = null so the UI can prompt the
// owner to build one, rather than silently reporting a fake 100% margin.
async function menuItemMargins(venueId) {
  const [items] = await pool.query('SELECT id, name, price FROM `MenuItem` WHERE venueId = ?', [venueId]);
  const [costRows] = await pool.query(
    `SELECT ri.menuItemId, SUM(ri.quantity * rm.costPerUnit) AS cost
     FROM \`RecipeItem\` ri
     JOIN \`RawMaterial\` rm ON rm.id = ri.rawMaterialId
     WHERE rm.venueId = ? AND ri.menuItemId IS NOT NULL
     GROUP BY ri.menuItemId`,
    [venueId]
  );
  const costByItem = new Map(costRows.map((r) => [r.menuItemId, Number(r.cost)]));

  return items.map((item) => {
    const cost = costByItem.has(item.id) ? costByItem.get(item.id) : null;
    const price = Number(item.price);
    const margin = cost === null ? null : price - cost;
    const marginPercent = cost === null || price === 0 ? null : Math.round((margin / price) * 1000) / 10;
    return { id: item.id, name: item.name, price, cost, margin, marginPercent };
  });
}

async function createRecipeItem(venueId, { menuItemId, modifierOptionId, rawMaterialId, quantity }) {
  if (!menuItemId && !modifierOptionId) {
    const err = new Error('menuItemId یا modifierOptionId الزامی است.');
    err.status = 400;
    throw err;
  }
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `RecipeItem` (id, menuItemId, modifierOptionId, rawMaterialId, quantity) VALUES (?, ?, ?, ?, ?)',
    [id, menuItemId || null, modifierOptionId || null, rawMaterialId, quantity]
  );
  return findById('RecipeItem', id);
}

async function updateRecipeItem(id, { quantity }) {
  await pool.query('UPDATE `RecipeItem` SET quantity = ? WHERE id = ?', [quantity, id]);
  return findById('RecipeItem', id);
}

async function deleteRecipeItem(id) {
  return deleteById('RecipeItem', id);
}

// --- Stock Adjustments ---

async function adjustStock(rawMaterialId, delta, reason, performedBy, notes, costPerUnit, orderId) {
  const [[mat]] = await pool.query('SELECT * FROM `RawMaterial` WHERE id = ?', [rawMaterialId]);
  if (!mat) {
    const err = new Error('ماده اولیه یافت نشد.');
    err.status = 404;
    throw err;
  }
  const newStock = Number(mat.currentStock) + Number(delta);
  await pool.query('UPDATE `RawMaterial` SET currentStock = ? WHERE id = ?', [newStock, rawMaterialId]);
  await pool.query(
    'INSERT INTO `StockAdjustment` (id, rawMaterialId, venueId, delta, reason, notes, costPerUnit, orderId, performedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [randomUUID(), rawMaterialId, mat.venueId, delta, reason, notes || null, costPerUnit || null, orderId || null, performedBy || null]
  );
  return { ...mat, currentStock: newStock };
}

async function listAdjustments(venueId, { limit = 100, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT sa.*, rm.name AS materialName, rm.unit, u.name AS performedByName
     FROM \`StockAdjustment\` sa
     JOIN \`RawMaterial\` rm ON rm.id = sa.rawMaterialId
     LEFT JOIN \`User\` u ON u.id = sa.performedBy
     WHERE sa.venueId = ?
     ORDER BY sa.createdAt DESC
     LIMIT ? OFFSET ?`,
    [venueId, limit, offset]
  );
  return rows;
}

// Called after order creation — fire-and-forget safe.
async function deductStockForOrder(orderId, venueId) {
  // Only run if venue has inventory enabled
  const [[venue]] = await pool.query('SELECT inventoryEnabled FROM `Venue` WHERE id = ?', [venueId]);
  if (!venue || !venue.inventoryEnabled) return;

  const [orderItems] = await pool.query(
    `SELECT oi.menuItemId, oi.quantity, oi.variantSelections
     FROM \`OrderItem\` oi WHERE oi.orderId = ?`,
    [orderId]
  );

  for (const oi of orderItems) {
    if (!oi.menuItemId) continue;
    // Base menu item recipes
    const [recipes] = await pool.query(
      'SELECT * FROM `RecipeItem` WHERE menuItemId = ?',
      [oi.menuItemId]
    );
    for (const recipe of recipes) {
      const delta = -(Number(recipe.quantity) * Number(oi.quantity));
      await adjustStock(recipe.rawMaterialId, delta, 'ORDER_CONSUMED', null, `سفارش ${orderId}`, null, orderId);
    }

    // Modifier option recipes (from variantSelections snapshot)
    const selections = oi.variantSelections
      ? (typeof oi.variantSelections === 'string' ? JSON.parse(oi.variantSelections) : oi.variantSelections)
      : [];
    const optionIds = selections.map((s) => s.optionId).filter(Boolean);
    if (optionIds.length > 0) {
      const placeholders = optionIds.map(() => '?').join(', ');
      const [optRecipes] = await pool.query(
        `SELECT * FROM \`RecipeItem\` WHERE modifierOptionId IN (${placeholders})`,
        optionIds
      );
      for (const recipe of optRecipes) {
        const delta = -(Number(recipe.quantity) * Number(oi.quantity));
        await adjustStock(recipe.rawMaterialId, delta, 'ORDER_CONSUMED', null, `سفارش ${orderId}`, null, orderId);
      }
    }
  }
}

// --- Suppliers ---

async function listSuppliers(venueId) {
  const [rows] = await pool.query('SELECT * FROM `Supplier` WHERE venueId = ? ORDER BY name ASC', [venueId]);
  return rows;
}

async function createSupplier(venueId, data) {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `Supplier` (id, venueId, name, contactName, phone, email, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, venueId, data.name, data.contactName || null, data.phone || null, data.email || null, data.notes || null]
  );
  return findById('Supplier', id);
}

async function updateSupplier(id, data) {
  return updateById('Supplier', id, data, ['name', 'contactName', 'phone', 'email', 'notes']);
}

async function deleteSupplier(id) {
  return deleteById('Supplier', id);
}

// --- Purchase Orders ---

async function listPurchaseOrders(venueId) {
  const [orders] = await pool.query(
    `SELECT po.*, s.name AS supplierName
     FROM \`PurchaseOrder\` po
     LEFT JOIN \`Supplier\` s ON s.id = po.supplierId
     WHERE po.venueId = ?
     ORDER BY po.createdAt DESC`,
    [venueId]
  );
  if (orders.length === 0) return [];
  const poIds = orders.map((o) => o.id);
  const placeholders = poIds.map(() => '?').join(', ');
  const [items] = await pool.query(
    `SELECT poi.*, rm.name AS materialName, rm.unit
     FROM \`PurchaseOrderItem\` poi
     JOIN \`RawMaterial\` rm ON rm.id = poi.rawMaterialId
     WHERE poi.purchaseOrderId IN (${placeholders})`,
    poIds
  );
  const itemsByPo = new Map();
  for (const item of items) {
    if (!itemsByPo.has(item.purchaseOrderId)) itemsByPo.set(item.purchaseOrderId, []);
    itemsByPo.get(item.purchaseOrderId).push(item);
  }
  return orders.map((o) => ({ ...o, items: itemsByPo.get(o.id) || [] }));
}

async function createPurchaseOrder(venueId, { supplierId, notes, items }) {
  const id = randomUUID();
  const totalCost = (items || []).reduce((s, i) => s + Number(i.quantity) * Number(i.costPerUnit), 0);
  await pool.query(
    'INSERT INTO `PurchaseOrder` (id, venueId, supplierId, notes, totalCost) VALUES (?, ?, ?, ?, ?)',
    [id, venueId, supplierId || null, notes || null, totalCost]
  );
  for (const item of items || []) {
    await pool.query(
      'INSERT INTO `PurchaseOrderItem` (id, purchaseOrderId, rawMaterialId, quantity, costPerUnit) VALUES (?, ?, ?, ?, ?)',
      [randomUUID(), id, item.rawMaterialId, item.quantity, item.costPerUnit || 0]
    );
  }
  const [orders] = await pool.query('SELECT * FROM `PurchaseOrder` WHERE id = ?', [id]);
  return orders[0];
}

async function updatePurchaseOrderStatus(id, status, performedBy) {
  await pool.query('UPDATE `PurchaseOrder` SET status = ?, orderedAt = IF(? = \'ORDERED\', NOW(), orderedAt), receivedAt = IF(? = \'RECEIVED\', NOW(), receivedAt) WHERE id = ?', [status, status, status, id]);
  if (status === 'RECEIVED') {
    // Create RESTOCK adjustments for each line item
    const [items] = await pool.query('SELECT * FROM `PurchaseOrderItem` WHERE purchaseOrderId = ?', [id]);
    for (const item of items) {
      await adjustStock(item.rawMaterialId, item.quantity, 'RESTOCK', performedBy, `سفارش خرید ${id}`, item.costPerUnit, null);
    }
  }
  return findById('PurchaseOrder', id);
}

const MARGIN_ALERT_THRESHOLD_PERCENT = 15;

// Runs on the same once-a-minute poll as the other scheduled jobs (see
// server.js) — walks every active venue's recipe-costed menu items and pings
// the owner once a raw-material cost hike has squeezed a margin below the
// threshold, so pricing doesn't quietly erode. Re-alerts at most once every
// 24h per item (checked against the most recent matching notification), not
// every minute, and never for items with no recipe defined (cost === null).
async function checkMarginAlerts() {
  const { createNotification } = require('../notifications/service');

  const [venues] = await pool.query("SELECT id, ownerId FROM `Venue` WHERE status = 'ACTIVE'");
  for (const venue of venues) {
    if (!venue.ownerId) continue;
    const margins = await menuItemMargins(venue.id);
    const atRisk = margins.filter((m) => m.marginPercent !== null && m.marginPercent < MARGIN_ALERT_THRESHOLD_PERCENT);
    if (atRisk.length === 0) continue;

    for (const item of atRisk) {
      const [[recent]] = await pool.query(
        `SELECT id FROM \`Notification\`
         WHERE userId = ? AND type = 'SYSTEM' AND JSON_EXTRACT(data, '$.marginAlertMenuItemId') = ?
           AND createdAt >= NOW() - INTERVAL 1 DAY
         LIMIT 1`,
        [venue.ownerId, item.id]
      );
      if (recent) continue;

      await createNotification(
        venue.ownerId,
        'SYSTEM',
        'هشدار افت حاشیه سود',
        `حاشیه سود «${item.name}» به ${item.marginPercent}٪ رسیده — قیمت یا مواد اولیه‌اش رو بازبینی کن.`,
        { marginAlertMenuItemId: item.id, marginPercent: item.marginPercent }
      );
    }
  }
}

module.exports = {
  listMaterials, createMaterial, updateMaterial, deleteMaterial, listLowStock,
  listRecipes, getRecipesForMenuItem, createRecipeItem, updateRecipeItem, deleteRecipeItem, menuItemMargins,
  checkMarginAlerts,
  adjustStock, listAdjustments, deductStockForOrder,
  listSuppliers, createSupplier, updateSupplier, deleteSupplier,
  listPurchaseOrders, createPurchaseOrder, updatePurchaseOrderStatus,
};
