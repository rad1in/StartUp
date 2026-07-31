const express = require('express');
const router = express.Router({ mergeParams: true });
const c = require('./controller');
const { authenticate, requireRole, requireVenueScope } = require('../../middleware/auth');

const guard = [authenticate, requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']), requireVenueScope('venueId')];

router.get('/materials', ...guard, c.listMaterials);
router.post('/materials', ...guard, c.createMaterial);
router.patch('/materials/:materialId', ...guard, c.updateMaterial);
router.delete('/materials/:materialId', ...guard, c.deleteMaterial);
router.get('/materials/low-stock', ...guard, c.listLowStock);

router.get('/recipes', ...guard, c.listRecipes);
router.post('/recipes', ...guard, c.createRecipeItem);
router.patch('/recipes/:recipeItemId', ...guard, c.updateRecipeItem);
router.delete('/recipes/:recipeItemId', ...guard, c.deleteRecipeItem);
router.get('/margins', ...guard, c.menuItemMargins);

router.post('/adjustments', ...guard, c.adjustStock);
router.get('/adjustments', ...guard, c.listAdjustments);

router.get('/suppliers', ...guard, c.listSuppliers);
router.post('/suppliers', ...guard, c.createSupplier);
router.patch('/suppliers/:supplierId', ...guard, c.updateSupplier);
router.delete('/suppliers/:supplierId', ...guard, c.deleteSupplier);

router.get('/purchase-orders', ...guard, c.listPurchaseOrders);
router.post('/purchase-orders', ...guard, c.createPurchaseOrder);
router.patch('/purchase-orders/:poId/status', ...guard, c.updatePurchaseOrderStatus);

module.exports = router;
