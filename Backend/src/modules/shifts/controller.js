const service = require('./service');

async function list(req, res, next) {
  try {
    const { userId, from, to } = req.query;
    const scopedUserId = req.user.role === 'VENUE_STAFF' ? req.user.id : userId;
    res.json(await service.listShifts(req.params.venueId, { userId: scopedUserId, from, to }));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await service.createShift(req.params.venueId, req.body));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    res.json(await service.updateShift(req.params.shiftId, req.body));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteShift(req.params.shiftId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function clockIn(req, res, next) {
  try {
    res.json(await service.clockIn(req.params.shiftId, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function clockOut(req, res, next) {
  try {
    res.json(await service.clockOut(req.params.shiftId, req.user.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, clockIn, clockOut };
