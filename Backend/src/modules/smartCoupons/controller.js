const service = require('./service');

async function getConfig(req, res, next) {
  try {
    res.json(await service.getConfig(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function updateConfig(req, res, next) {
  try {
    res.json(await service.updateConfig(req.params.venueId, req.body));
  } catch (err) {
    next(err);
  }
}

async function listLog(req, res, next) {
  try {
    res.json(await service.listLog(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function runNow(req, res, next) {
  try {
    const config = await service.getConfig(req.params.venueId);
    const result = await service.runForVenue(req.params.venueId, { ...config, isActive: true });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getConfig, updateConfig, listLog, runNow };
