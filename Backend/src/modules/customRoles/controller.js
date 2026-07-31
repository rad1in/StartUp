const service = require('./service');

async function list(req, res, next) {
  try {
    res.json(await service.listRoles());
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, permissions } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'نام نقش الزامی است.' });
    res.status(201).json(await service.createRole({ name, permissions: permissions || [] }));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    res.json(await service.updateRole(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteRole(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function applyToStaff(req, res, next) {
  try {
    res.json(await service.applyRoleToStaff(req.params.id, req.params.userId));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, applyToStaff };
