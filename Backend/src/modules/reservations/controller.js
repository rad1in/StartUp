const service = require('./service');

async function create(req, res, next) {
  try {
    const customerId = req.user?.role === 'CUSTOMER' ? req.user.id : null;
    const reservation = await service.createReservation(req.params.venueId, req.body, customerId);
    res.status(201).json(reservation);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { from, to, status } = req.query;
    res.json(await service.listReservations(req.params.venueId, { from, to, status }));
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    res.json(await service.updateReservationStatus(req.params.venueId, req.params.id, req.body.status));
  } catch (err) {
    next(err);
  }
}

async function joinWaitlist(req, res, next) {
  try {
    const customerId = req.user?.role === 'CUSTOMER' ? req.user.id : null;
    const entry = await service.joinWaitlist(req.params.venueId, req.body, customerId);
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
}

async function listWaitlist(req, res, next) {
  try {
    res.json(await service.listWaitlist(req.params.venueId, { status: req.query.status }));
  } catch (err) {
    next(err);
  }
}

async function updateWaitlistStatus(req, res, next) {
  try {
    res.json(await service.updateWaitlistStatus(req.params.venueId, req.params.id, req.body.status));
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, updateStatus, joinWaitlist, listWaitlist, updateWaitlistStatus };
