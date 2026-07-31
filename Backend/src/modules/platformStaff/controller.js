const service = require('./service');
const { PERMISSION_KEYS } = require('../../middleware/platformPermission');

async function list(req, res, next) {
  try {
    res.json(await service.listAdminStaff());
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { email, password, name, phone, role, permissions } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: 'ایمیل، رمز عبور، نام و نقش الزامی است.' });
    }
    res.status(201).json(await service.createAdminStaff({ email, password, name, phone, role, permissions }));
  } catch (err) {
    next(err);
  }
}

async function updatePermissions(req, res, next) {
  try {
    res.json(await service.updateAdminPermissions(req.params.userId, req.body.permissions, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.removeAdminStaff(req.params.userId, req.user.id);
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
    if (req.user.role === 'SUPER_ADMIN') {
      return res.json({ permissions: PERMISSION_KEYS, isOwner: true });
    }
    res.json({ permissions: await service.getUserPermissions(req.user.id), isOwner: false });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, updatePermissions, remove, catalogue, myPermissions };
