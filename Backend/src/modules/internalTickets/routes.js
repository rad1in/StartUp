'use strict';
const { Router } = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const c = require('./controller');

const router = Router();
const staff = [authenticate, requireRole(['SUPER_ADMIN', 'SUPPORT_STAFF', 'FINANCE_STAFF'])];

router.get('/',                          ...staff, c.list);
router.get('/summary',                   ...staff, c.summary);
router.post('/',                         ...staff, c.create);
router.post('/escalate',                 ...staff, c.escalate);
router.get('/:ticketId',                 ...staff, c.getOne);
router.patch('/:ticketId',               ...staff, c.update);
router.post('/:ticketId/comments',       ...staff, c.addComment);

module.exports = router;
