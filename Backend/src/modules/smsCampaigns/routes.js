const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole, requireVenueScope } = require('../../middleware/auth');
const { requireVenuePermission } = require('../../middleware/venuePermission');
const { requirePlatformPermission, ADMIN_TEAM_ROLES } = require('../../middleware/platformPermission');

// Venue-scoped router — mounted at /api/venues/:venueId/sms-campaigns.
const router = express.Router({ mergeParams: true });

const staffOnly = [
  authenticate,
  requireRole(['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN']),
  requireVenueScope('venueId'),
  requireVenuePermission('marketing.manage'),
];

router.get('/', ...staffOnly, controller.listCampaigns);
router.post('/', ...staffOnly, controller.createCampaign);
router.get('/credit', ...staffOnly, controller.getCredit);
router.get('/credit/transactions', ...staffOnly, controller.listCreditTransactions);
router.post('/credit/topup', ...staffOnly, controller.topUpCredit);

// Top-up verification doesn't need venue scoping — the providerRef already
// uniquely identifies the pending transaction (mirrors /wallet/topup/verify).
const verifyRouter = express.Router();
verifyRouter.get('/verify/:providerRef', authenticate, controller.verifyCreditTopUp);

// Admin review queue — mounted at /api/admin/sms-campaigns.
const adminRouter = express.Router();
adminRouter.use(authenticate, requireRole(ADMIN_TEAM_ROLES), requirePlatformPermission('sms.manage'));
adminRouter.get('/', controller.listForAdmin);
adminRouter.post('/:id/approve', controller.approveCampaign);
adminRouter.post('/:id/reject', controller.rejectCampaign);

module.exports = router;
module.exports.verifyRouter = verifyRouter;
module.exports.adminRouter = adminRouter;
