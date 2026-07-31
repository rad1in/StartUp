const service = require('./service');
const { logActivity } = require('../../lib/activityLog');
const { parseCsv } = require('../../lib/csv');
const { menuImageUrlFor } = require('../../lib/upload');
const { isManagementContext } = require('../../lib/autoTranslate');

async function listCategories(req, res, next) {
  try {
    const lang = isManagementContext(req, req.params.venueId) ? undefined : req.query.lang;
    res.json(await service.listCategories(req.params.venueId, lang));
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await service.createCategory(req.params.venueId, req.body);
    await logActivity(req.params.venueId, req.user.id, 'CATEGORY_CREATED', 'Category', category.id, req.body);
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await service.updateCategory(req.params.categoryId, req.body);
    await logActivity(req.params.venueId, req.user.id, 'CATEGORY_UPDATED', 'Category', req.params.categoryId, req.body);
    res.json(category);
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    await service.deleteCategory(req.params.categoryId);
    await logActivity(req.params.venueId, req.user.id, 'CATEGORY_DELETED', 'Category', req.params.categoryId, null);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listMenuItems(req, res, next) {
  try {
    res.json(await service.listMenuItems(req.params.venueId, { publicOnly: true, lang: req.query.lang }));
  } catch (err) {
    next(err);
  }
}

async function listMenuItemsForManagement(req, res, next) {
  try {
    res.json(await service.listMenuItems(req.params.venueId, { publicOnly: false }));
  } catch (err) {
    next(err);
  }
}

async function createMenuItem(req, res, next) {
  try {
    const item = await service.createMenuItem(req.params.venueId, req.body);
    await logActivity(req.params.venueId, req.user.id, 'MENU_ITEM_CREATED', 'MenuItem', item.id, req.body);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}

async function updateMenuItem(req, res, next) {
  try {
    const item = await service.updateMenuItem(req.params.itemId, req.body);
    await logActivity(req.params.venueId, req.user.id, 'MENU_ITEM_UPDATED', 'MenuItem', req.params.itemId, req.body);
    res.json(item);
  } catch (err) {
    next(err);
  }
}

async function deleteMenuItem(req, res, next) {
  try {
    await service.deleteMenuItem(req.params.itemId);
    await logActivity(req.params.venueId, req.user.id, 'MENU_ITEM_DELETED', 'MenuItem', req.params.itemId, null);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function uploadItemImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'فایل تصویری ارسال نشده است.' });
    const imageUrl = menuImageUrlFor(req.file.filename);
    const item = await service.updateMenuItem(req.params.itemId, { imageUrl });
    await logActivity(req.params.venueId, req.user.id, 'MENU_ITEM_IMAGE_UPDATED', 'MenuItem', req.params.itemId, { imageUrl });
    res.json(item);
  } catch (err) {
    next(err);
  }
}

async function bulkUpdateMenuItems(req, res, next) {
  try {
    const items = await service.bulkUpdateMenuItems(req.params.venueId, req.body);
    await logActivity(req.params.venueId, req.user.id, 'MENU_ITEMS_BULK_UPDATED', 'MenuItem', null, req.body);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function importMenuItems(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'فایل CSV ارسال نشده است.' });
    const rows = parseCsv(req.file.buffer.toString('utf8'));
    if (rows.length === 0) {
      return res.status(400).json({ message: 'فایل خالی است یا ستون‌های آن قابل تشخیص نیست.' });
    }
    if (rows.length > 1000) {
      return res.status(400).json({ message: 'حداکثر ۱۰۰۰ ردیف در هر بار مجاز است.' });
    }
    const result = await service.bulkImportMenuItems(req.params.venueId, rows);
    await logActivity(req.params.venueId, req.user.id, 'MENU_ITEMS_BULK_IMPORTED', 'MenuItem', null, {
      created: result.created,
      errorCount: result.errors.length,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listModifierGroups(req, res, next) {
  try {
    res.json(await service.listModifierGroups(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function createModifierGroup(req, res, next) {
  try {
    const group = await service.createModifierGroup(req.params.venueId, req.body);
    await logActivity(req.params.venueId, req.user.id, 'MODIFIER_GROUP_CREATED', 'ModifierGroup', group.id, req.body);
    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
}

async function updateModifierGroup(req, res, next) {
  try {
    const group = await service.updateModifierGroup(req.params.groupId, req.body);
    await logActivity(req.params.venueId, req.user.id, 'MODIFIER_GROUP_UPDATED', 'ModifierGroup', req.params.groupId, req.body);
    res.json(group);
  } catch (err) {
    next(err);
  }
}

async function deleteModifierGroup(req, res, next) {
  try {
    await service.deleteModifierGroup(req.params.groupId);
    await logActivity(req.params.venueId, req.user.id, 'MODIFIER_GROUP_DELETED', 'ModifierGroup', req.params.groupId, null);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function createModifierOption(req, res, next) {
  try {
    res.status(201).json(await service.createModifierOption(req.params.groupId, req.body));
  } catch (err) {
    next(err);
  }
}

async function updateModifierOption(req, res, next) {
  try {
    res.json(await service.updateModifierOption(req.params.optionId, req.body));
  } catch (err) {
    next(err);
  }
}

async function deleteModifierOption(req, res, next) {
  try {
    await service.deleteModifierOption(req.params.optionId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function setItemModifiers(req, res, next) {
  try {
    await service.setItemModifiers(req.params.itemId, req.body.groupIds || []);
    res.json(await service.getItemModifiers(req.params.itemId));
  } catch (err) {
    next(err);
  }
}

async function getItemModifiers(req, res, next) {
  try {
    res.json(await service.getItemModifiers(req.params.itemId));
  } catch (err) {
    next(err);
  }
}

async function listPairingRules(req, res, next) {
  try {
    res.json(await service.listPairingRules(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function createPairingRule(req, res, next) {
  try {
    res.status(201).json(await service.createPairingRule(req.params.venueId, req.body));
  } catch (err) {
    next(err);
  }
}

async function deletePairingRule(req, res, next) {
  try {
    await service.deletePairingRule(req.params.ruleId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function getSuggestionsForItems(req, res, next) {
  try {
    const itemIds = req.query.items ? String(req.query.items).split(',').filter(Boolean) : [];
    const suggestion = await service.getSuggestionsForItems(req.params.venueId, itemIds);
    res.json(suggestion || null);
  } catch (err) {
    next(err);
  }
}

async function getPersonalRecommendations(req, res, next) {
  try {
    const customerId = req.user?.role === 'CUSTOMER' ? req.user.id : null;
    res.json(await service.getPersonalRecommendations(req.params.venueId, customerId));
  } catch (err) {
    next(err);
  }
}

async function listCombos(req, res, next) {
  try {
    res.json(await service.listCombos(req.params.venueId, { publicOnly: true }));
  } catch (err) {
    next(err);
  }
}

async function listCombosForManagement(req, res, next) {
  try {
    res.json(await service.listCombos(req.params.venueId, { publicOnly: false }));
  } catch (err) {
    next(err);
  }
}

async function createCombo(req, res, next) {
  try {
    const combo = await service.createCombo(req.params.venueId, req.body);
    await logActivity(req.params.venueId, req.user.id, 'COMBO_CREATED', 'Combo', combo.id, req.body);
    res.status(201).json(combo);
  } catch (err) {
    next(err);
  }
}

async function updateCombo(req, res, next) {
  try {
    const combo = await service.updateCombo(req.params.venueId, req.params.comboId, req.body);
    await logActivity(req.params.venueId, req.user.id, 'COMBO_UPDATED', 'Combo', req.params.comboId, req.body);
    res.json(combo);
  } catch (err) {
    next(err);
  }
}

async function deleteCombo(req, res, next) {
  try {
    await service.deleteCombo(req.params.comboId);
    await logActivity(req.params.venueId, req.user.id, 'COMBO_DELETED', 'Combo', req.params.comboId, null);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listMenuItems,
  listMenuItemsForManagement,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  uploadItemImage,
  importMenuItems,
  bulkUpdateMenuItems,
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
  listCombosForManagement,
  createCombo,
  updateCombo,
  deleteCombo,
};
