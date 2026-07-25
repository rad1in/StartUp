const service = require('./service');

async function create(req, res, next) {
  try {
    const { venueId, tableId, note } = req.body;
    res.status(201).json(await service.createCall(venueId, tableId, note));
  } catch (err) {
    next(err);
  }
}

async function listForVenue(req, res, next) {
  try {
    res.json(await service.listPendingForVenue(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function resolve(req, res, next) {
  try {
    res.json(await service.resolveCall(req.params.venueId, req.params.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listForVenue, resolve };
