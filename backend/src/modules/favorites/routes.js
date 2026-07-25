const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate, requireRole('CUSTOMER'));

router.get('/venues', controller.listVenues);
router.post('/venues/:venueId', controller.addVenue);
router.delete('/venues/:venueId', controller.removeVenue);

router.get('/items', controller.listItems);
router.post('/items/:menuItemId', controller.addItem);
router.patch('/items/:menuItemId', controller.updateItem);
router.delete('/items/:menuItemId', controller.removeItem);

router.get('/recently-viewed', controller.recentlyViewed);

module.exports = router;
