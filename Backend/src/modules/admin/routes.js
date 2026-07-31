const express = require('express');
const controller = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { requirePlatformPermission, ADMIN_TEAM_ROLES } = require('../../middleware/platformPermission');

const router = express.Router();

router.use(authenticate, requireRole(ADMIN_TEAM_ROLES));

router.get('/stats', controller.stats);
router.get('/dashboard', controller.dashboard);
router.get('/search', controller.globalSearch);

// Broadcast announcements — restricted to full platform admins.
router.post('/broadcast', requireRole('SUPER_ADMIN'), controller.broadcastAnnouncement);
router.post('/broadcast/schedule', requireRole('SUPER_ADMIN'), controller.scheduleBroadcast);
router.get('/broadcast/scheduled', requireRole('SUPER_ADMIN'), controller.listScheduledBroadcasts);
router.delete('/broadcast/scheduled/:id', requireRole('SUPER_ADMIN'), controller.cancelScheduledBroadcast);

// Venue management
const venuesManage = requirePlatformPermission('venues.manage');
router.get('/venues', venuesManage, controller.listVenues);
router.get('/venues/:venueId/full', venuesManage, controller.getVenueFull);
router.get('/venues/:venueId/orders', venuesManage, controller.getVenueOrders);
router.get('/venues/:venueId/accounting-summary', venuesManage, controller.getVenueAccountingSummary);
router.patch('/venues/:venueId/approve', venuesManage, controller.approveVenue);
router.patch('/venues/:venueId/reject', venuesManage, controller.rejectVenue);
router.patch('/venues/:venueId/suspend', venuesManage, controller.suspendVenue);
// Impersonation is a bigger blast radius than routine venue management —
// restricted to the platform owner even though venuesManage covers the rest.
router.post('/venues/:venueId/impersonate', requireRole('SUPER_ADMIN'), controller.impersonateVenueOwner);
router.patch('/venues/:venueId/reactivate', venuesManage, controller.reactivateVenue);
router.patch('/venues/:venueId/featured', venuesManage, controller.setVenueFeatured);
router.patch('/venues/:venueId/subscription', requirePlatformPermission('billing.manage'), controller.updateVenueSubscription);
router.get('/subscription-requests', requirePlatformPermission('billing.manage'), controller.listSubscriptionRequests);

// Customer management
const customersManage = requirePlatformPermission('customers.manage');
router.get('/customers', customersManage, controller.listCustomers);
router.get('/customers/:userId', customersManage, controller.getCustomer);
router.patch('/customers/:userId/suspend', customersManage, controller.suspendCustomer);
router.patch('/customers/:userId/reactivate', customersManage, controller.reactivateCustomer);
router.patch('/customers/:userId/loyalty-adjust', customersManage, controller.adjustCustomerLoyalty);
router.post('/coupons/platform', customersManage, controller.createPlatformCoupon);

// Legacy flat user list/role editor (kept for compatibility with venue-staff role assignment)
router.get('/users', controller.listUsers);
router.patch('/users/:userId/role', controller.updateUserRole);

// Billing
const billingManage = requirePlatformPermission('billing.manage');
router.get('/payouts', billingManage, controller.listPayouts);
router.post('/venues/:venueId/payouts', billingManage, controller.createPayout);
router.patch('/payouts/:payoutId/mark-paid', billingManage, controller.markPayoutPaid);
router.get('/plans', billingManage, controller.getPlans);
router.patch('/plans/:tier', billingManage, controller.updatePlan);

// Security
const securityManage = requirePlatformPermission('security.manage');
router.get('/activity-log', securityManage, controller.activityLog);
router.post('/users/:userId/force-logout', securityManage, controller.forceLogout);
router.get('/users/:userId/sessions', securityManage, controller.listUserSessions);
router.get('/blocked-ips', securityManage, controller.listBlockedIps);
router.post('/blocked-ips', securityManage, controller.blockIp);
router.delete('/blocked-ips/:id', securityManage, controller.unblockIp);
router.get('/system-health', securityManage, controller.systemHealth);
router.get('/recent-api-errors', securityManage, controller.recentApiErrors);

module.exports = router;
