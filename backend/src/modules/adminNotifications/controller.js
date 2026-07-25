const service = require('./service');

async function list(req, res, next) {
  try {
    res.json(await service.list());
  } catch (err) {
    next(err);
  }
}

async function unreadCount(req, res, next) {
  try {
    res.json({ count: await service.unreadCount() });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    await service.markRead(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    await service.markAllRead();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, unreadCount, markRead, markAllRead };
