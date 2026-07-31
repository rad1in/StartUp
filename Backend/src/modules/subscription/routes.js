const { Router } = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const c = require('./controller');

const router = Router();
const adminOnly = [authenticate, requireRole(['SUPER_ADMIN', 'FINANCE_STAFF'])];

router.get('/plan', c.getPlan);
router.get('/me', authenticate, requireRole('CUSTOMER'), c.getMine);
router.post('/purchase', authenticate, requireRole('CUSTOMER'), c.purchase);

router.patch('/admin/plan', ...adminOnly, c.updatePlan);
router.get('/admin/list', ...adminOnly, c.adminList);
router.get('/admin/stats', ...adminOnly, c.adminStats);

module.exports = router;
