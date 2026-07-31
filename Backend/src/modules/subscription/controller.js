const service = require('./service');

async function getPlan(req, res, next) {
  try {
    res.json(await service.getPlan());
  } catch (err) {
    next(err);
  }
}

async function updatePlan(req, res, next) {
  try {
    const { price, enabled } = req.body;
    res.json(await service.updatePlan({ price, enabled }));
  } catch (err) {
    next(err);
  }
}

async function getMine(req, res, next) {
  try {
    res.json(await service.getMySubscription(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function purchase(req, res, next) {
  try {
    res.status(201).json(await service.purchaseSubscription(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function adminList(req, res, next) {
  try {
    res.json(await service.adminListSubscriptions());
  } catch (err) {
    next(err);
  }
}

async function adminStats(req, res, next) {
  try {
    res.json(await service.adminStats());
  } catch (err) {
    next(err);
  }
}

module.exports = { getPlan, updatePlan, getMine, purchase, adminList, adminStats };
