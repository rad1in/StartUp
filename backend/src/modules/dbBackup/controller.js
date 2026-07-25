const service = require('./service');

async function create(req, res, next) {
  try {
    const backup = await service.createBackup(req.user.id, { auto: false });
    res.status(201).json(backup);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    res.json(await service.listBackups());
  } catch (err) {
    next(err);
  }
}

async function download(req, res, next) {
  try {
    const filePath = service.getBackupFilePath(req.params.filename);
    res.download(filePath, req.params.filename);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteBackup(req.params.filename);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function restore(req, res, next) {
  try {
    await service.restoreBackup(req.params.filename, req.user.id);
    res.json({ restored: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, download, remove, restore };
