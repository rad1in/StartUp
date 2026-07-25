const service = require('./service');

async function list(req, res, next) {
  try {
    res.json(await service.listKeys(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await service.createKey(req.params.venueId, req.body.label));
  } catch (err) {
    next(err);
  }
}

async function revoke(req, res, next) {
  try {
    await service.revokeKey(req.params.keyId, req.params.venueId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, revoke };
