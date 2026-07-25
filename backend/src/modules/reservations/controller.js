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

module.exports = { create, list, updateStatus };
