const service = require('./service');
const venuesService = require('../venues/service');
const ordersService = require('../orders/service');
const accountingService = require('../accounting/service');
const couponsService = require('../coupons/service');
const plansService = require('../plans/service');

async function listUsers(req, res, next) {
  try {
    res.json(await service.listUsers());
  } catch (err) {
    next(err);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const { role, venueId } = req.body;
    res.json(await service.updateUserRole(req.params.userId, role, venueId));
  } catch (err) {
    next(err);
  }
}

async function listVenues(req, res, next) {
  try {
    const { status, subscriptionTier, city, search } = req.query;
    res.json(await service.listVenuesWithOwners({ status, subscriptionTier, city, search }));
  } catch (err) {
    next(err);
  }
}

async function getVenueFull(req, res, next) {
  try {
    res.json(await venuesService.getVenue(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function getVenueOrders(req, res, next) {
  try {
    res.json(await ordersService.listOrdersForVenue(req.params.venueId, req.query));
  } catch (err) {
    next(err);
  }
}

async function getVenueAccountingSummary(req, res, next) {
  try {
    res.json(await accountingService.salesSummary(req.params.venueId, req.query.period));
  } catch (err) {
    next(err);
  }
}

async function approveVenue(req, res, next) {
  try {
    res.json(await service.setVenueStatus(req.params.venueId, 'ACTIVE', req.body.reason, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function rejectVenue(req, res, next) {
  try {
    res.json(await service.setVenueStatus(req.params.venueId, 'REJECTED', req.body.reason, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function suspendVenue(req, res, next) {
  try {
    res.json(await service.setVenueStatus(req.params.venueId, 'SUSPENDED', req.body.reason, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function reactivateVenue(req, res, next) {
  try {
    res.json(await service.setVenueStatus(req.params.venueId, 'ACTIVE', req.body.reason, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function setVenueFeatured(req, res, next) {
  try {
    res.json(await service.setVenueFeatured(req.params.venueId, req.body.isFeatured, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function updateVenueSubscription(req, res, next) {
  try {
    res.json(await service.updateVenueSubscription(req.params.venueId, req.body.subscriptionTier));
  } catch (err) {
    next(err);
  }
}

async function listSubscriptionRequests(req, res, next) {
  try {
    res.json(await service.listPendingSubscriptionRequests());
  } catch (err) {
    next(err);
  }
}

async function listCustomers(req, res, next) {
  try {
    const { search, isSuspended } = req.query;
    res.json(
      await service.listCustomers({
        search,
        isSuspended: isSuspended === undefined ? undefined : isSuspended === 'true',
      })
    );
  } catch (err) {
    next(err);
  }
}

async function getCustomer(req, res, next) {
  try {
    res.json(await service.getCustomerDetail(req.params.userId));
  } catch (err) {
    next(err);
  }
}

async function suspendCustomer(req, res, next) {
  try {
    res.json(await service.setCustomerSuspension(req.params.userId, true, req.body.reason, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function reactivateCustomer(req, res, next) {
  try {
    res.json(await service.setCustomerSuspension(req.params.userId, false, null, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function adjustCustomerLoyalty(req, res, next) {
  try {
    const { points, reason } = req.body;
    res.json(await service.adjustCustomerLoyalty(req.params.userId, Number(points), reason, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function createPlatformCoupon(req, res, next) {
  try {
    res.status(201).json(await couponsService.createVenueCoupon(null, req.body));
  } catch (err) {
    next(err);
  }
}

async function createPayout(req, res, next) {
  try {
    const { amount, periodStart, periodEnd } = req.body;
    if (!amount || !periodStart || !periodEnd) {
      return res.status(400).json({ message: 'مبلغ و بازه زمانی الزامی است.' });
    }
    res.status(201).json(await service.createPayout(req.params.venueId, { amount, periodStart, periodEnd }));
  } catch (err) {
    next(err);
  }
}

async function markPayoutPaid(req, res, next) {
  try {
    res.json(await service.markPayoutPaid(req.params.payoutId));
  } catch (err) {
    next(err);
  }
}

async function listPayouts(req, res, next) {
  try {
    res.json(await service.listAllPayouts());
  } catch (err) {
    next(err);
  }
}

async function activityLog(req, res, next) {
  try {
    const { venueId, entityType, action, userId, from, to } = req.query;
    res.json(await service.platformActivityLog({ venueId, entityType, action, userId, from, to }));
  } catch (err) {
    next(err);
  }
}

async function forceLogout(req, res, next) {
  try {
    await service.forceLogout(req.params.userId, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listUserSessions(req, res, next) {
  try {
    res.json(await service.listUserSessions(req.params.userId));
  } catch (err) {
    next(err);
  }
}

async function systemHealth(req, res, next) {
  try {
    res.json(await service.systemHealth());
  } catch (err) {
    next(err);
  }
}

async function getPlans(req, res, next) {
  try {
    res.json(await plansService.listPlans());
  } catch (err) {
    next(err);
  }
}

async function updatePlan(req, res, next) {
  try {
    res.json(await service.updatePlan(req.params.tier, req.body.commissionRate));
  } catch (err) {
    next(err);
  }
}

async function impersonateVenueOwner(req, res, next) {
  try {
    res.json(await service.impersonateVenueOwner(req.params.venueId, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function recentApiErrors(req, res, next) {
  try {
    res.json(await service.listRecentApiErrors(req.query.limit));
  } catch (err) {
    next(err);
  }
}

async function globalSearch(req, res, next) {
  try {
    res.json(await service.globalSearch(req.query.q));
  } catch (err) {
    next(err);
  }
}

async function broadcastAnnouncement(req, res, next) {
  try {
    const { title, body, audience } = req.body;
    res.status(201).json(await service.broadcastAnnouncement({ title, body, audience }, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function scheduleBroadcast(req, res, next) {
  try {
    const { title, body, audience, scheduledAt } = req.body;
    res.status(201).json(await service.scheduleBroadcast({ title, body, audience, scheduledAt }, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function listScheduledBroadcasts(req, res, next) {
  try {
    res.json(await service.listScheduledBroadcasts());
  } catch (err) {
    next(err);
  }
}

async function cancelScheduledBroadcast(req, res, next) {
  try {
    await service.cancelScheduledBroadcast(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function dashboard(req, res, next) {
  try {
    res.json(await service.dashboard());
  } catch (err) {
    next(err);
  }
}

async function stats(req, res, next) {
  try {
    res.json(await service.platformStats());
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  updateUserRole,
  listVenues,
  getVenueFull,
  getVenueOrders,
  getVenueAccountingSummary,
  approveVenue,
  rejectVenue,
  suspendVenue,
  setVenueFeatured,
  reactivateVenue,
  updateVenueSubscription,
  listSubscriptionRequests,
  listCustomers,
  getCustomer,
  suspendCustomer,
  reactivateCustomer,
  adjustCustomerLoyalty,
  createPlatformCoupon,
  createPayout,
  markPayoutPaid,
  listPayouts,
  activityLog,
  forceLogout,
  listUserSessions,
  systemHealth,
  recentApiErrors,
  impersonateVenueOwner,
  getPlans,
  updatePlan,
  dashboard,
  stats,
  globalSearch,
  broadcastAnnouncement,
  scheduleBroadcast,
  listScheduledBroadcasts,
  cancelScheduledBroadcast,
};
