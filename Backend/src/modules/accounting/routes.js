const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole, requireVenueScope } = require('../../middleware/auth');
const { requireVenuePermission } = require('../../middleware/venuePermission');

const router = express.Router();

const staffOnly = [
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('venueId'),
  requireVenuePermission('accounting.view'),
];

router.get('/:venueId/dashboard', ...staffOnly, controller.dashboard);
router.get('/:venueId/summary', ...staffOnly, controller.summary);
router.get('/:venueId/revenue-by-category', ...staffOnly, controller.byCategory);
router.get('/:venueId/revenue-by-item', ...staffOnly, controller.byItem);

router.get('/:venueId/expenses', ...staffOnly, controller.listExpenses);
router.post('/:venueId/expenses', ...staffOnly, controller.createExpense);
router.delete('/:venueId/expenses/:expenseId', ...staffOnly, controller.deleteExpense);

router.get('/:venueId/payouts', ...staffOnly, controller.listPayouts);

module.exports = router;
