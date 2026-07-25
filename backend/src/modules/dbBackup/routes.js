const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

const router = express.Router();

// Restore overwrites the entire live database — restricted to the platform
// owner, not the broader admin-team roles that other /admin routes allow.
router.use(authenticate, requireRole('SUPER_ADMIN'));

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:filename/download', controller.download);
router.delete('/:filename', controller.remove);
router.post('/:filename/restore', controller.restore);

module.exports = router;
