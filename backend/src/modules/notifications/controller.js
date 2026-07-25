const service = require('./service');

async function list(req, res, next) {
  try {
    res.json(await service.listNotifications(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    await service.markAsRead(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    await service.markAllAsRead(req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function getPreferences(req, res, next) {
  try {
    res.json(await service.getPreferences(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function setPreference(req, res, next) {
  try {
    const { category, enabled } = req.body;
    await service.setPreference(req.user.id, category, !!enabled);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, markRead, markAllRead, getPreferences, setPreference };
