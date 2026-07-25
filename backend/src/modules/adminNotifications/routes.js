const { Router } = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const c = require('./controller');

const router = Router();
const adminOnly = [authenticate, requireRole(['SUPER_ADMIN', 'SUPPORT_STAFF', 'FINANCE_STAFF'])];

router.get('/', ...adminOnly, c.list);
router.get('/unread-count', ...adminOnly, c.unreadCount);
router.patch('/:id/read', ...adminOnly, c.markRead);
router.patch('/read-all', ...adminOnly, c.markAllRead);

module.exports = router;
