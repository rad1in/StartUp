const service = require('./service');

async function listForOwner(req, res, next) {
  try {
    res.json(await service.listPlansForOwner(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function listPublic(req, res, next) {
  try {
    res.json(await service.listActivePlansForCustomers(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await service.createPlan(req.params.venueId, req.body));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    res.json(await service.updatePlan(req.params.venueId, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function purchase(req, res, next) {
  try {
    res.status(201).json(await service.purchasePlan(req.user.id, req.params.planId));
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    res.json(await service.listMyCards(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function listMineForVenue(req, res, next) {
  try {
    res.json(await service.listMyCardsForVenue(req.user.id, req.params.venueId));
  } catch (err) {
    next(err);
  }
}

module.exports = { listForOwner, listPublic, create, update, purchase, listMine, listMineForVenue };
