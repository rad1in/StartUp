const { Router } = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const c = require('./controller');

const router = Router();
router.get('/me', authenticate, requireRole('CUSTOMER'), c.getMine);

module.exports = router;
