const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.use(authenticate, requireRole(['CUSTOMER']));

router.get('/', controller.getBalance);
router.get('/transactions', controller.getTransactions);
router.post('/topup', controller.topUp);
router.get('/topup/verify/:providerRef', controller.verifyTopUp);

module.exports = router;
