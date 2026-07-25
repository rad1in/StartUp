const express = require('express');
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.get('/public-key', controller.publicKey);
router.post('/subscribe', authenticate, controller.subscribe);
router.post('/unsubscribe', authenticate, controller.unsubscribe);
router.post('/expo-token', authenticate, controller.registerExpoToken);
router.delete('/expo-token', authenticate, controller.unregisterExpoToken);

module.exports = router;
