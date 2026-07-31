const svc = require('./service');

function venueId(req) { return req.params.venueId; }

async function listMaterials(req, res, next) {
  try { res.json(await svc.listMaterials(venueId(req))); } catch (e) { next(e); }
}
async function createMaterial(req, res, next) {
  try { res.status(201).json(await svc.createMaterial(venueId(req), req.body)); } catch (e) { next(e); }
}
async function updateMaterial(req, res, next) {
  try { res.json(await svc.updateMaterial(req.params.materialId, req.body)); } catch (e) { next(e); }
}
async function deleteMaterial(req, res, next) {
  try { await svc.deleteMaterial(req.params.materialId); res.json({ ok: true }); } catch (e) { next(e); }
}
async function listLowStock(req, res, next) {
  try { res.json(await svc.listLowStock(venueId(req))); } catch (e) { next(e); }
}

async function listRecipes(req, res, next) {
  try { res.json(await svc.listRecipes(venueId(req))); } catch (e) { next(e); }
}
async function createRecipeItem(req, res, next) {
  try { res.status(201).json(await svc.createRecipeItem(venueId(req), req.body)); } catch (e) { next(e); }
}
async function updateRecipeItem(req, res, next) {
  try { res.json(await svc.updateRecipeItem(req.params.recipeItemId, req.body)); } catch (e) { next(e); }
}
async function deleteRecipeItem(req, res, next) {
  try { await svc.deleteRecipeItem(req.params.recipeItemId); res.json({ ok: true }); } catch (e) { next(e); }
}
async function menuItemMargins(req, res, next) {
  try { res.json(await svc.menuItemMargins(venueId(req))); } catch (e) { next(e); }
}

async function adjustStock(req, res, next) {
  try {
    const { rawMaterialId, delta, reason, notes, costPerUnit } = req.body;
    res.json(await svc.adjustStock(rawMaterialId, delta, reason, req.user.id, notes, costPerUnit));
  } catch (e) { next(e); }
}
async function listAdjustments(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;
    res.json(await svc.listAdjustments(venueId(req), { limit, offset }));
  } catch (e) { next(e); }
}

async function listSuppliers(req, res, next) {
  try { res.json(await svc.listSuppliers(venueId(req))); } catch (e) { next(e); }
}
async function createSupplier(req, res, next) {
  try { res.status(201).json(await svc.createSupplier(venueId(req), req.body)); } catch (e) { next(e); }
}
async function updateSupplier(req, res, next) {
  try { res.json(await svc.updateSupplier(req.params.supplierId, req.body)); } catch (e) { next(e); }
}
async function deleteSupplier(req, res, next) {
  try { await svc.deleteSupplier(req.params.supplierId); res.json({ ok: true }); } catch (e) { next(e); }
}

async function listPurchaseOrders(req, res, next) {
  try { res.json(await svc.listPurchaseOrders(venueId(req))); } catch (e) { next(e); }
}
async function createPurchaseOrder(req, res, next) {
  try { res.status(201).json(await svc.createPurchaseOrder(venueId(req), req.body)); } catch (e) { next(e); }
}
async function updatePurchaseOrderStatus(req, res, next) {
  try {
    res.json(await svc.updatePurchaseOrderStatus(req.params.poId, req.body.status, req.user.id));
  } catch (e) { next(e); }
}

module.exports = {
  listMaterials, createMaterial, updateMaterial, deleteMaterial, listLowStock,
  listRecipes, createRecipeItem, updateRecipeItem, deleteRecipeItem, menuItemMargins,
  adjustStock, listAdjustments,
  listSuppliers, createSupplier, updateSupplier, deleteSupplier,
  listPurchaseOrders, createPurchaseOrder, updatePurchaseOrderStatus,
};
