const service = require('./service');

async function list(req, res, next) {
  try {
    res.json(await service.listRules(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await service.createRule(req.params.venueId, req.body));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    res.json(await service.updateRule(req.params.ruleId, req.params.venueId, req.body));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteRule(req.params.ruleId, req.params.venueId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function active(req, res, next) {
  try {
    const rule = await service.getActiveRule(req.params.venueId);
    res.json({ active: !!rule, rule });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, active };
