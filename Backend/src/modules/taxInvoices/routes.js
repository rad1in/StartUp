const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole, requireVenueScope } = require('../../middleware/auth');
const { requireVenuePermission } = require('../../middleware/venuePermission');

// Venue-scoped router — mounted at /api/venues/:venueId/tax-invoices.
const router = express.Router({ mergeParams: true });

const staffOnly = [
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('venueId'),
  requireVenuePermission('accounting.view'),
];

router.get('/', ...staffOnly, controller.listForVenue);
router.post('/order/:orderId', ...staffOnly, controller.generateForOrder);

// Order-scoped download — mounted at /api/orders/:id/tax-invoice.pdf
// alongside the existing receipt.pdf route; access is checked per-order
// inside the controller (customer who owns it, or that order's venue staff).
const downloadRouter = express.Router();
downloadRouter.get('/:id/tax-invoice.pdf', authenticate, controller.downloadForOrder);
downloadRouter.post('/:id/tax-invoice/email', authenticate, controller.emailForOrder);

module.exports = router;
module.exports.downloadRouter = downloadRouter;
