const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { ADMIN_TEAM_ROLES } = require('../../middleware/platformPermission');

const router = express.Router();

router.get('/permissions-catalogue', controller.catalogue);

router.get('/me/permissions', authenticate, requireRole(ADMIN_TEAM_ROLES), controller.myPermissions);

router.use(authenticate, requireRole('SUPER_ADMIN'));

router.get('/', controller.list);
router.post('/', controller.create);
router.patch('/:userId/permissions', controller.updatePermissions);
router.delete('/:userId', controller.remove);

module.exports = router;
