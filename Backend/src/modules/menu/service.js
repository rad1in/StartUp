const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, updateById, deleteById } = require('../../lib/sqlHelpers');
const { scheduleTranslation, applyTranslation, applyTranslationToList } = require('../../lib/autoTranslate');

async function listCategories(venueId, lang) {
  const [rows] = await pool.query('SELECT * FROM `Category` WHERE venueId = ? ORDER BY sortOrder ASC', [venueId]);
  return applyTranslationToList(rows, lang, ['name'], 'Category');
}

async function createCategory(venueId, { name, sortOrder }) {
  const id = randomUUID();
  await pool.query('INSERT INTO `Category` (id, venueId, name, sortOrder) VALUES (?, ?, ?, ?)', [
    id,
    venueId,
    name,
    sortOrder || 0,
  ]);
  scheduleTranslation('Category', id, { name });
  return findById('Category', id);
}

async function updateCategory(id, data) {
  const category = await updateById('Category', id, data, ['name', 'sortOrder', 'isHidden']);
  if (data.name !== undefined) scheduleTranslation('Category', id, { name: data.name });
  return category;
}

async function deleteCategory(id) {
  return deleteById('Category', id);
}

// scheduleDays uses MySQL's DAYOFWEEK convention: 1=Sunday ... 7=Saturday.
function isWithinSchedule(item, now = new Date()) {
  if (item.scheduleDays) {
    const day = now.getDay() + 1; // JS getDay(): 0=Sunday -> convert to 1=Sunday
    const allowedDays = item.scheduleDays.split(',').map(Number);
    if (!allowedDays.includes(day)) return false;
  }
  if (item.scheduleStart && item.scheduleEnd) {
    const current = now.toTimeString().slice(0, 8);
    if (current < item.scheduleStart || current > item.scheduleEnd) return false;
  }
  return true;
}

async function listMenuItems(venueId, { publicOnly = false, lang } = {}) {
  const [allRows] = await pool.query('SELECT * FROM `MenuItem` WHERE venueId = ?', [venueId]);
  const rows = applyTranslationToList(allRows, lang, ['name', 'description', 'tags'], 'MenuItem');
  const items = publicOnly ? rows.filter((item) => item.isAvailable && isWithinSchedule(item)) : rows;
  if (items.length === 0) return [];

  // Attach modifier groups (with options) to each item.
  const itemIds = items.map((i) => i.id);
  const itemPlaceholders = itemIds.map(() => '?').join(', ');
  const [junctionRows] = await pool.query(
    `SELECT mim.menuItemId, mim.sortOrder AS attachOrder, mg.*
     FROM \`MenuItemModifier\` mim
     JOIN \`ModifierGroup\` mg ON mg.id = mim.groupId
     WHERE mim.menuItemId IN (${itemPlaceholders})
     ORDER BY mim.menuItemId, mim.sortOrder`,
    itemIds
  );

  if (junctionRows.length > 0) {
    const groupIds = [...new Set(junctionRows.map((r) => r.id))];
    const groupPlaceholders = groupIds.map(() => '?').join(', ');
    const [optionRows] = await pool.query(
      `SELECT * FROM \`ModifierOption\` WHERE groupId IN (${groupPlaceholders}) ORDER BY sortOrder`,
      groupIds
    );
    const optsByGroup = new Map();
    for (const opt of optionRows) {
      if (!optsByGroup.has(opt.groupId)) optsByGroup.set(opt.groupId, []);
      optsByGroup.get(opt.groupId).push(opt);
    }
    // Build group objects keyed by id (deduplicated).
    const groupById = new Map();
    for (const r of junctionRows) {
      if (!groupById.has(r.id)) {
        groupById.set(r.id, {
          id: r.id, venueId: r.venueId, name: r.name, type: r.type,
          isRequired: !!r.isRequired, minSelections: r.minSelections, maxSelections: r.maxSelections,
          sortOrder: r.sortOrder, options: optsByGroup.get(r.id) || [],
        });
      }
    }
    // Attach to items.
    const groupsByItem = new Map();
    for (const r of junctionRows) {
      if (!groupsByItem.has(r.menuItemId)) groupsByItem.set(r.menuItemId, []);
      groupsByItem.get(r.menuItemId).push(groupById.get(r.id));
    }
    return items.map((item) => ({ ...item, modifierGroups: groupsByItem.get(item.id) || [] }));
  }

  return items.map((item) => ({ ...item, modifierGroups: [] }));
}

async function createMenuItem(venueId, data) {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO \`MenuItem\` (id, venueId, categoryId, name, description, price, imageUrl, tags, isAvailable, scheduleStart, scheduleEnd, scheduleDays)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      venueId,
      data.categoryId,
      data.name,
      data.description || null,
      data.price,
      data.imageUrl || null,
      data.tags || null,
      data.isAvailable ?? true,
      data.scheduleStart || null,
      data.scheduleEnd || null,
      data.scheduleDays || null,
    ]
  );
  scheduleTranslation('MenuItem', id, { name: data.name, description: data.description, tags: data.tags });
  return findById('MenuItem', id);
}

// rows: array of { category, name, description, price, isAvailable } parsed from
// an uploaded CSV. Categories are matched by name (case-insensitive) or created.
async function bulkImportMenuItems(venueId, rows) {
  const existingCategories = await listCategories(venueId);
  const categoryByName = new Map(existingCategories.map((c) => [c.name.trim().toLowerCase(), c]));

  const results = { created: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +1 for header row, +1 for 1-indexing
    const row = rows[i];
    const name = (row.name || '').trim();
    const priceRaw = (row.price || '').trim();
    const categoryName = (row.category || '').trim();

    if (!name || !categoryName || !priceRaw) {
      results.errors.push(`ردیف ${rowNum}: نام، دسته‌بندی و قیمت الزامی است.`);
      continue;
    }
    const price = Number(priceRaw);
    if (!Number.isFinite(price) || price < 0) {
      results.errors.push(`ردیف ${rowNum}: قیمت نامعتبر است.`);
      continue;
    }

    const key = categoryName.toLowerCase();
    let category = categoryByName.get(key);
    if (!category) {
      category = await createCategory(venueId, { name: categoryName, sortOrder: categoryByName.size });
      categoryByName.set(key, category);
    }

    const isAvailableRaw = (row.isAvailable || '').trim().toLowerCase();
    const isAvailable = isAvailableRaw === '' || ['1', 'true', 'yes', 'بله', 'موجود'].includes(isAvailableRaw);

    await createMenuItem(venueId, {
      categoryId: category.id,
      name,
      description: row.description || null,
      price,
      isAvailable,
    });
    results.created++;
  }
  return results;
}

async function updateMenuItem(id, data) {
  const item = await updateById('MenuItem', id, data, [
    'categoryId',
    'name',
    'description',
    'price',
    'imageUrl',
    'tags',
    'isAvailable',
    'scheduleStart',
    'scheduleEnd',
    'scheduleDays',
  ]);
  if (data.name !== undefined || data.description !== undefined || data.tags !== undefined) {
    scheduleTranslation('MenuItem', id, {
      name: data.name ?? item.name,
      description: data.description ?? item.description,
      tags: data.tags ?? item.tags,
    });
  }
  return item;
}

async function deleteMenuItem(id) {
  return deleteById('MenuItem', id);
}

async function bulkUpdateMenuItems(venueId, { ids, isAvailable, priceMultiplier }) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');

  if (isAvailable !== undefined) {
    await pool.query(`UPDATE \`MenuItem\` SET isAvailable = ? WHERE venueId = ? AND id IN (${placeholders})`, [
      isAvailable,
      venueId,
      ...ids,
    ]);
  }
  if (priceMultiplier) {
    await pool.query(
      `UPDATE \`MenuItem\` SET price = ROUND(price * ?, 2) WHERE venueId = ? AND id IN (${placeholders})`,
      [priceMultiplier, venueId, ...ids]
    );
  }

  const [rows] = await pool.query(`SELECT * FROM \`MenuItem\` WHERE id IN (${placeholders})`, ids);
  return rows;
}

// --- Modifier Groups (venue-level reusable) ---

async function listModifierGroups(venueId) {
  const [groups] = await pool.query(
    'SELECT * FROM `ModifierGroup` WHERE venueId = ? ORDER BY sortOrder ASC',
    [venueId]
  );
  if (groups.length === 0) return [];
  const groupIds = groups.map((g) => g.id);
  const placeholders = groupIds.map(() => '?').join(', ');
  const [options] = await pool.query(
    `SELECT * FROM \`ModifierOption\` WHERE groupId IN (${placeholders}) ORDER BY sortOrder ASC`,
    groupIds
  );
  const optionsByGroup = new Map();
  for (const opt of options) {
    if (!optionsByGroup.has(opt.groupId)) optionsByGroup.set(opt.groupId, []);
    optionsByGroup.get(opt.groupId).push(opt);
  }
  return groups.map((g) => ({ ...g, options: optionsByGroup.get(g.id) || [] }));
}

async function createModifierGroup(venueId, { name, type, isRequired, minSelections, maxSelections, sortOrder }) {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `ModifierGroup` (id, venueId, name, type, isRequired, minSelections, maxSelections, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, venueId, name, type || 'SINGLE_SELECT', !!isRequired, minSelections || 0, maxSelections ?? null, sortOrder || 0]
  );
  return { ...(await findById('ModifierGroup', id)), options: [] };
}

async function updateModifierGroup(id, data) {
  return updateById('ModifierGroup', id, data, ['name', 'type', 'isRequired', 'minSelections', 'maxSelections', 'sortOrder']);
}

async function deleteModifierGroup(id) {
  return deleteById('ModifierGroup', id);
}

async function createModifierOption(groupId, { name, priceAdjustment, isDefault, sortOrder }) {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `ModifierOption` (id, groupId, name, priceAdjustment, isDefault, sortOrder) VALUES (?, ?, ?, ?, ?, ?)',
    [id, groupId, name, priceAdjustment || 0, !!isDefault, sortOrder || 0]
  );
  return findById('ModifierOption', id);
}

async function updateModifierOption(id, data) {
  return updateById('ModifierOption', id, data, ['name', 'priceAdjustment', 'isDefault', 'sortOrder']);
}

async function deleteModifierOption(id) {
  return deleteById('ModifierOption', id);
}

async function setItemModifiers(menuItemId, groupIds) {
  await pool.query('DELETE FROM `MenuItemModifier` WHERE menuItemId = ?', [menuItemId]);
  for (let i = 0; i < groupIds.length; i++) {
    await pool.query(
      'INSERT INTO `MenuItemModifier` (menuItemId, groupId, sortOrder) VALUES (?, ?, ?)',
      [menuItemId, groupIds[i], i]
    );
  }
}

async function getItemModifiers(menuItemId) {
  const [rows] = await pool.query(
    `SELECT mg.*, mim.sortOrder AS attachSortOrder
     FROM \`MenuItemModifier\` mim
     JOIN \`ModifierGroup\` mg ON mg.id = mim.groupId
     WHERE mim.menuItemId = ?
     ORDER BY mim.sortOrder ASC`,
    [menuItemId]
  );
  if (rows.length === 0) return [];
  const groupIds = rows.map((r) => r.id);
  const placeholders = groupIds.map(() => '?').join(', ');
  const [options] = await pool.query(
    `SELECT * FROM \`ModifierOption\` WHERE groupId IN (${placeholders}) ORDER BY sortOrder ASC`,
    groupIds
  );
  const optionsByGroup = new Map();
  for (const opt of options) {
    if (!optionsByGroup.has(opt.groupId)) optionsByGroup.set(opt.groupId, []);
    optionsByGroup.get(opt.groupId).push(opt);
  }
  return rows.map((g) => ({ ...g, options: optionsByGroup.get(g.id) || [] }));
}

// --- Pairing Rules ---

async function listPairingRules(venueId) {
  const [rows] = await pool.query(
    `SELECT ipr.*, mi_t.name AS triggerName, mi_s.name AS suggestedName,
            mi_s.price AS suggestedPrice, mi_s.imageUrl AS suggestedImageUrl,
            mi_s.description AS suggestedDescription
     FROM \`ItemPairingRule\` ipr
     JOIN \`MenuItem\` mi_t ON mi_t.id = ipr.triggerMenuItemId
     JOIN \`MenuItem\` mi_s ON mi_s.id = ipr.suggestedMenuItemId
     WHERE ipr.venueId = ?
     ORDER BY ipr.priority DESC`,
    [venueId]
  );
  return rows;
}

async function createPairingRule(venueId, { triggerMenuItemId, suggestedMenuItemId, priority }) {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `ItemPairingRule` (id, venueId, triggerMenuItemId, suggestedMenuItemId, priority) VALUES (?, ?, ?, ?, ?)',
    [id, venueId, triggerMenuItemId, suggestedMenuItemId, priority || 0]
  );
  return findById('ItemPairingRule', id);
}

async function deletePairingRule(id) {
  return deleteById('ItemPairingRule', id);
}

async function getSuggestionsForItems(venueId, cartMenuItemIds) {
  if (!cartMenuItemIds || cartMenuItemIds.length === 0) return null;
  const placeholders = cartMenuItemIds.map(() => '?').join(', ');

  // Try venue-configured rules first.
  const [ruleRows] = await pool.query(
    `SELECT ipr.suggestedMenuItemId, mi.name, mi.price, mi.imageUrl, mi.description, mi.isAvailable
     FROM \`ItemPairingRule\` ipr
     JOIN \`MenuItem\` mi ON mi.id = ipr.suggestedMenuItemId
     WHERE ipr.triggerMenuItemId IN (${placeholders})
       AND ipr.suggestedMenuItemId NOT IN (${placeholders})
       AND mi.isAvailable = TRUE
     ORDER BY ipr.priority DESC
     LIMIT 3`,
    [...cartMenuItemIds, ...cartMenuItemIds]
  );
  if (ruleRows.length > 0) {
    const r = ruleRows[0];
    return { id: r.suggestedMenuItemId, name: r.name, price: r.price, imageUrl: r.imageUrl, description: r.description };
  }

  // Co-purchase fallback: items frequently ordered together in the last 90 days.
  const [coRows] = await pool.query(
    `SELECT oi2.menuItemId AS id, mi.name, mi.price, mi.imageUrl, mi.description, COUNT(*) AS freq
     FROM \`OrderItem\` oi1
     JOIN \`Order\` o ON o.id = oi1.orderId AND o.venueId = ? AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 90 DAY)
     JOIN \`OrderItem\` oi2 ON oi2.orderId = o.id AND oi2.menuItemId IS NOT NULL
     JOIN \`MenuItem\` mi ON mi.id = oi2.menuItemId AND mi.isAvailable = TRUE
     WHERE oi1.menuItemId IN (${placeholders})
       AND oi2.menuItemId NOT IN (${placeholders})
     GROUP BY oi2.menuItemId, mi.name, mi.price, mi.imageUrl, mi.description
     ORDER BY freq DESC
     LIMIT 1`,
    [venueId, ...cartMenuItemIds, ...cartMenuItemIds]
  );
  if (coRows.length > 0) {
    const r = coRows[0];
    return { id: r.id, name: r.name, price: r.price, imageUrl: r.imageUrl, description: r.description };
  }
  return null;
}

// Personalized "you might also like" for the menu page — favors items from
// categories the customer orders most (across ALL venues, so their taste
// follows them), available at this venue, that they haven't tried here yet.
// Guests and customers with no history get this venue's best-sellers instead.
async function getPersonalRecommendations(venueId, customerId, limit = 4) {
  if (customerId) {
    const [rows] = await pool.query(
      `SELECT mi.id, mi.name, mi.price, mi.imageUrl, mi.description,
              COUNT(*) OVER (PARTITION BY mi.categoryId) AS categoryAffinity
       FROM \`MenuItem\` mi
       WHERE mi.venueId = ? AND mi.isAvailable = TRUE
         AND mi.categoryId IN (
           SELECT categoryId FROM (
             SELECT mi2.categoryId
             FROM \`OrderItem\` oi
             JOIN \`Order\` o ON o.id = oi.orderId AND o.customerId = ?
             JOIN \`MenuItem\` mi2 ON mi2.id = oi.menuItemId
             GROUP BY mi2.categoryId
             ORDER BY COUNT(*) DESC
             LIMIT 3
           ) top_categories
         )
         AND mi.id NOT IN (
           SELECT oi.menuItemId FROM \`OrderItem\` oi
           JOIN \`Order\` o ON o.id = oi.orderId AND o.customerId = ? AND o.venueId = ?
           WHERE oi.menuItemId IS NOT NULL
         )
       ORDER BY categoryAffinity DESC
       LIMIT ?`,
      [venueId, customerId, customerId, venueId, limit]
    );
    if (rows.length > 0) return rows;
  }

  const [fallback] = await pool.query(
    `SELECT mi.id, mi.name, mi.price, mi.imageUrl, mi.description, COUNT(*) AS orderCount
     FROM \`OrderItem\` oi
     JOIN \`Order\` o ON o.id = oi.orderId AND o.venueId = ? AND o.paymentStatus = 'SUCCESS'
     JOIN \`MenuItem\` mi ON mi.id = oi.menuItemId AND mi.isAvailable = TRUE
     GROUP BY mi.id, mi.name, mi.price, mi.imageUrl, mi.description
     ORDER BY orderCount DESC
     LIMIT ?`,
    [venueId, limit]
  );
  return fallback;
}

// --- Combos ---

async function listCombos(venueId, { publicOnly = false } = {}) {
  const query = publicOnly
    ? 'SELECT * FROM `Combo` WHERE venueId = ? AND isActive = TRUE'
    : 'SELECT * FROM `Combo` WHERE venueId = ?';
  const [combos] = await pool.query(query, [venueId]);
  if (combos.length === 0) return [];

  const comboIds = combos.map((c) => c.id);
  const placeholders = comboIds.map(() => '?').join(', ');
  const [items] = await pool.query(
    `SELECT ci.*, mi.name AS menuItemName, mi.price AS menuItemPrice FROM \`ComboItem\` ci
     JOIN \`MenuItem\` mi ON mi.id = ci.menuItemId
     WHERE ci.comboId IN (${placeholders})`,
    comboIds
  );

  const itemsByCombo = new Map();
  for (const item of items) {
    if (!itemsByCombo.has(item.comboId)) itemsByCombo.set(item.comboId, []);
    itemsByCombo.get(item.comboId).push(item);
  }

  return combos.map((combo) => ({ ...combo, items: itemsByCombo.get(combo.id) || [] }));
}

async function createCombo(venueId, { name, description, price, imageUrl, items }) {
  const id = randomUUID();
  await pool.query('INSERT INTO `Combo` (id, venueId, name, description, price, imageUrl) VALUES (?, ?, ?, ?, ?, ?)', [
    id,
    venueId,
    name,
    description || null,
    price,
    imageUrl || null,
  ]);

  for (const item of items || []) {
    await pool.query('INSERT INTO `ComboItem` (id, comboId, menuItemId, quantity) VALUES (?, ?, ?, ?)', [
      randomUUID(),
      id,
      item.menuItemId,
      item.quantity || 1,
    ]);
  }

  return (await listCombos(venueId)).find((c) => c.id === id);
}

async function updateCombo(venueId, id, data) {
  const combo = await updateById('Combo', id, data, ['name', 'description', 'price', 'imageUrl', 'isActive']);
  if (data.items) {
    await pool.query('DELETE FROM `ComboItem` WHERE comboId = ?', [id]);
    for (const item of data.items) {
      await pool.query('INSERT INTO `ComboItem` (id, comboId, menuItemId, quantity) VALUES (?, ?, ?, ?)', [
        randomUUID(),
        id,
        item.menuItemId,
        item.quantity || 1,
      ]);
    }
  }
  return (await listCombos(venueId)).find((c) => c.id === id) || combo;
}

async function deleteCombo(id) {
  return deleteById('Combo', id);
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  bulkUpdateMenuItems,
  bulkImportMenuItems,
  listModifierGroups,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  createModifierOption,
  updateModifierOption,
  deleteModifierOption,
  setItemModifiers,
  getItemModifiers,
  listPairingRules,
  createPairingRule,
  deletePairingRule,
  getSuggestionsForItems,
  getPersonalRecommendations,
  listCombos,
  createCombo,
  updateCombo,
  deleteCombo,
};
