const express = require('express');
const controller = require('./controller');

const router = express.Router();

router.get('/methods', controller.listMethods);
router.post('/checkout', controller.checkout);
router.get('/verify/:providerRef', controller.verify);
// Saman/PayPing post here directly (see their provider files) — public, no
// auth: the bank/gateway is the caller, not a logged-in user.
router.post('/saman/callback', controller.samanCallback);
router.post('/payping/callback', controller.paypingCallback);

module.exports = router;
