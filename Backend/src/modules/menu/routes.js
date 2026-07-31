const express = require('express');
const controller = require('./controller');
const { authenticate, optionalAuthenticate, requireRole, requireVenueScope } = require('../../middleware/auth');
const { requireVenuePermission } = require('../../middleware/venuePermission');
const { csvUpload, menuImageUpload, menuImageOptimize } = require('../../lib/upload');

const router = express.Router();

// Public: customer-facing menu browsing (items include attached modifierGroups)
router.get('/:venueId/categories', controller.listCategories);
router.get('/:venueId/items', controller.listMenuItems);
router.get('/:venueId/combos', controller.listCombos);
router.get('/:venueId/pairings/suggestions', controller.getSuggestionsForItems);
router.get('/:venueId/recommendations', optionalAuthenticate, controller.getPersonalRecommendations);

const staffOnly = [
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('venueId'),
];
const menuManage = [...staffOnly, requireVenuePermission('menu.manage')];

router.get('/:venueId/items/all', ...menuManage, controller.listMenuItemsForManagement);
router.get('/:venueId/combos/all', ...menuManage, controller.listCombosForManagement);

router.post('/:venueId/categories', ...menuManage, controller.createCategory);
router.patch('/:venueId/categories/:categoryId', ...menuManage, controller.updateCategory);
router.delete('/:venueId/categories/:categoryId', ...menuManage, controller.deleteCategory);

router.post('/:venueId/items', ...menuManage, controller.createMenuItem);
router.post('/:venueId/items/import', ...menuManage, csvUpload.single('file'), controller.importMenuItems);
router.patch('/:venueId/items/bulk', ...menuManage, controller.bulkUpdateMenuItems);
router.patch('/:venueId/items/:itemId', ...menuManage, controller.updateMenuItem);
router.delete('/:venueId/items/:itemId', ...menuManage, controller.deleteMenuItem);
router.post(
  '/:venueId/items/:itemId/image',
  ...menuManage,
  menuImageUpload.single('image'),
  menuImageOptimize,
  controller.uploadItemImage
);

// Per-item modifier attachment
router.get('/:venueId/items/:itemId/modifiers', ...staffOnly, controller.getItemModifiers);
router.put('/:venueId/items/:itemId/modifiers', ...menuManage, controller.setItemModifiers);

// Venue-level modifier groups
router.get('/:venueId/modifier-groups', ...staffOnly, controller.listModifierGroups);
router.post('/:venueId/modifier-groups', ...menuManage, controller.createModifierGroup);
router.patch('/:venueId/modifier-groups/:groupId', ...menuManage, controller.updateModifierGroup);
router.delete('/:venueId/modifier-groups/:groupId', ...menuManage, controller.deleteModifierGroup);
router.post('/:venueId/modifier-groups/:groupId/options', ...menuManage, controller.createModifierOption);
router.patch('/:venueId/modifier-groups/:groupId/options/:optionId', ...menuManage, controller.updateModifierOption);
router.delete('/:venueId/modifier-groups/:groupId/options/:optionId', ...menuManage, controller.deleteModifierOption);

// Pairing rules (venue-configurable complementary suggestions)
router.get('/:venueId/pairings', ...staffOnly, controller.listPairingRules);
router.post('/:venueId/pairings', ...menuManage, controller.createPairingRule);
router.delete('/:venueId/pairings/:ruleId', ...menuManage, controller.deletePairingRule);

router.post('/:venueId/combos', ...menuManage, controller.createCombo);
router.patch('/:venueId/combos/:comboId', ...menuManage, controller.updateCombo);
router.delete('/:venueId/combos/:comboId', ...menuManage, controller.deleteCombo);

module.exports = router;
