const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate, requireRole('CUSTOMER'));

router.get('/balance', controller.getBalance);
router.get('/transactions', controller.listTransactions);

module.exports = router;
