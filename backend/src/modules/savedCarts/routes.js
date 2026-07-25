const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate, requireRole('CUSTOMER'));

router.get('/:venueId', controller.getCart);
router.put('/:venueId', controller.upsertCart);
router.delete('/:venueId', controller.clearCart);

module.exports = router;
