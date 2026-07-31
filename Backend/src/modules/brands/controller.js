const svc = require('./service');

async function listBrands(req, res, next) {
  try { res.json(await svc.listBrandsForOwner(req.user.id)); } catch (e) { next(e); }
}
async function createBrand(req, res, next) {
  try { res.status(201).json(await svc.createBrand(req.user.id, req.body)); } catch (e) { next(e); }
}
async function updateBrand(req, res, next) {
  try { res.json(await svc.updateBrand(req.params.brandId, req.user.id, req.body)); } catch (e) { next(e); }
}
async function deleteBrand(req, res, next) {
  try { await svc.deleteBrand(req.params.brandId, req.user.id); res.json({ ok: true }); } catch (e) { next(e); }
}
async function listAvailableVenues(req, res, next) {
  try { res.json(await svc.listAvailableVenuesForOwner(req.user.id)); } catch (e) { next(e); }
}
async function addVenueToBrand(req, res, next) {
  try { await svc.addVenueToBrand(req.params.brandId, req.body.venueId, req.user.id); res.json({ ok: true }); } catch (e) { next(e); }
}
async function removeVenueFromBrand(req, res, next) {
  try { await svc.removeVenueFromBrand(req.params.venueId, req.user.id); res.json({ ok: true }); } catch (e) { next(e); }
}
async function getBrandReport(req, res, next) {
  try {
    const { from, to } = req.query;
    res.json(await svc.getBrandReport(req.params.brandId, req.user.id, { from, to }));
  } catch (e) { next(e); }
}
async function assignStaff(req, res, next) {
  try { await svc.assignStaffToBranch(req.body.staffUserId, req.body.venueId, req.user.id); res.json({ ok: true }); } catch (e) { next(e); }
}
async function removeStaff(req, res, next) {
  try { await svc.removeStaffFromBranch(req.params.staffUserId, req.params.venueId, req.user.id); res.json({ ok: true }); } catch (e) { next(e); }
}
async function listStaff(req, res, next) {
  try { res.json(await svc.listStaffForBrand(req.params.brandId, req.user.id)); } catch (e) { next(e); }
}

module.exports = { listBrands, createBrand, updateBrand, deleteBrand, listAvailableVenues, addVenueToBrand, removeVenueFromBrand, getBrandReport, assignStaff, removeStaff, listStaff };
