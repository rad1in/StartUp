const { Router } = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const c = require('./controller');

const router = Router();
const ownerOnly = [authenticate, requireRole(['SUPER_ADMIN'])];

router.get('/', ...ownerOnly, c.list);
router.post('/', ...ownerOnly, c.create);
router.patch('/:id', ...ownerOnly, c.update);
router.delete('/:id', ...ownerOnly, c.remove);
router.post('/:id/apply/:userId', ...ownerOnly, c.applyToStaff);

module.exports = router;
