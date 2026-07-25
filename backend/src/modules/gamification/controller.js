const service = require('./service');

async function me(req, res, next) {
  try {
    res.json(await service.getCustomerProgress(req.user.id));
  } catch (err) { next(err); }
}

async function listTiers(req, res, next) {
  try { res.json(await service.getTiers()); } catch (err) { next(err); }
}

async function createTier(req, res, next) {
  try { res.status(201).json(await service.createTier(req.body)); } catch (err) { next(err); }
}

async function updateTier(req, res, next) {
  try { res.json(await service.updateTier(req.params.tierId, req.body)); } catch (err) { next(err); }
}

async function deleteTier(req, res, next) {
  try { await service.deleteTier(req.params.tierId); res.json({ ok: true }); } catch (err) { next(err); }
}

async function listBadges(req, res, next) {
  try { res.json(await service.getBadges()); } catch (err) { next(err); }
}

async function createBadge(req, res, next) {
  try { res.status(201).json(await service.createBadge(req.body)); } catch (err) { next(err); }
}

async function updateBadge(req, res, next) {
  try { res.json(await service.updateBadge(req.params.badgeId, req.body)); } catch (err) { next(err); }
}

async function deleteBadge(req, res, next) {
  try { await service.deleteBadge(req.params.badgeId); res.json({ ok: true }); } catch (err) { next(err); }
}

module.exports = { me, listTiers, createTier, updateTier, deleteTier, listBadges, createBadge, updateBadge, deleteBadge };
