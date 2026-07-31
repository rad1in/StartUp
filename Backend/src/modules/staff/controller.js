const service = require('./service');
const { PERMISSION_KEYS } = require('../../middleware/venuePermission');

async function list(req, res, next) {
  try {
    res.json(await service.listStaff(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { email, password, name, phone, permissions } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'ایمیل، رمز عبور و نام الزامی است.' });
    }
    res.status(201).json(await service.createStaff(req.params.venueId, { email, password, name, phone, permissions }));
  } catch (err) {
    next(err);
  }
}

async function updatePermissions(req, res, next) {
  try {
    const { permissions } = req.body;
    res.json(
      await service.updateStaffPermissions(req.params.venueId, req.params.userId, permissions, req.user.id)
    );
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.removeStaff(req.params.venueId, req.params.userId, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function catalogue(req, res, next) {
  try {
    res.json({ permissions: PERMISSION_KEYS });
  } catch (err) {
    next(err);
  }
}

async function myPermissions(req, res, next) {
  try {
    if (req.user.role === 'VENUE_OWNER' || req.user.role === 'SUPER_ADMIN') {
      return res.json({ permissions: PERMISSION_KEYS, isOwner: true });
    }
    res.json({ permissions: await service.getUserPermissions(req.user.id), isOwner: false });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, updatePermissions, remove, catalogue, myPermissions };
