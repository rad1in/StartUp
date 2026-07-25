const service = require('./service');

async function getProfile(req, res, next) {
  try {
    res.json(await service.getProfile(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    res.json(await service.updateProfile(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'فایل تصویری ارسال نشده است.' });
    res.json(await service.setAvatar(req.user.id, req.file.filename));
  } catch (err) {
    next(err);
  }
}

async function uploadCoverImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'فایل تصویری ارسال نشده است.' });
    res.json(await service.setCoverImage(req.user.id, req.file.filename));
  } catch (err) {
    next(err);
  }
}

async function listCoupons(req, res, next) {
  try {
    res.json(await service.listAvailableCoupons());
  } catch (err) {
    next(err);
  }
}

async function listSessions(req, res, next) {
  try {
    res.json(await service.listSessions(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function revokeSession(req, res, next) {
  try {
    await service.revokeSession(req.user.id, req.params.sessionId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function deleteAccount(req, res, next) {
  try {
    await service.deleteAccount(req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  uploadCoverImage,
  listCoupons,
  listSessions,
  revokeSession,
  deleteAccount,
};
