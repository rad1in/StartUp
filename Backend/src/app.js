const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { config } = require('./config/config');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { apiRateLimiter } = require('./middleware/rateLimit');
const { ipBlocklistMiddleware } = require('./middleware/ipBlocklist');
const { renderStatusPage, sendStatus } = require('./lib/statusPage');
const { getSystemStatus } = require('./lib/systemStatus');

const authRoutes = require('./modules/auth/routes');
const venueRoutes = require('./modules/venues/routes');
const menuRoutes = require('./modules/menu/routes');
const orderRoutes = require('./modules/orders/routes');
const paymentRoutes = require('./modules/payments/routes');
const accountingRoutes = require('./modules/accounting/routes');
const customerRoutes = require('./modules/customers/routes');
const adminRoutes = require('./modules/admin/routes');
const loyaltyRoutes = require('./modules/loyalty/routes');
const couponRoutes = require('./modules/coupons/routes');
const favoriteRoutes = require('./modules/favorites/routes');
const reviewRoutes = require('./modules/reviews/routes');
const notificationRoutes = require('./modules/notifications/routes');
const supportRoutes = require('./modules/support/routes');
const staffRoutes = require('./modules/staff/routes');
const platformStaffRoutes = require('./modules/platformStaff/routes');
const contentRoutes = require('./modules/content/routes');
const integrationsRoutes = require('./modules/integrations/routes');
const reportsRoutes = require('./modules/reports/routes');
const tableSessionRoutes = require('./modules/tableSessions/routes');
const savedCartRoutes = require('./modules/savedCarts/routes');
const billShareRoutes = require('./modules/billShares/routes');
const walletRoutes = require('./modules/wallet/routes');
const gamificationRoutes = require('./modules/gamification/routes');
const forecastingRoutes = require('./modules/forecasting/routes');
const inventoryRoutes = require('./modules/inventory/routes');
const brandsRoutes = require('./modules/brands/routes');
const plansRoutes = require('./modules/plans/routes');
const mapRoutes = require('./modules/map/routes');
const biRoutes = require('./modules/bi/routes');
const platformAccountingRoutes = require('./modules/platformAccounting/routes');
const fraudRoutes = require('./modules/fraud/routes');
const internalTicketRoutes = require('./modules/internalTickets/routes');
const citiesRoutes = require('./modules/cities/routes');
const happyHourRoutes = require('./modules/happyHour/routes');
const reservationsRoutes = require('./modules/reservations/routes');
const venueCrmRoutes = require('./modules/venueCrm/routes');
const pushRoutes = require('./modules/push/routes');
const subscriptionRoutes = require('./modules/subscription/routes');
const customRolesRoutes = require('./modules/customRoles/routes');
const adminNotificationsRoutes = require('./modules/adminNotifications/routes');
const venueHealthRoutes = require('./modules/venueHealth/routes');
const referralRoutes = require('./modules/referral/routes');
const apiKeysRoutes = require('./modules/apiKeys/routes');
const webhooksRoutes = require('./modules/webhooks/routes');
const financialReportsRoutes = require('./modules/financialReports/routes');
const venueApprovalRoutes = require('./modules/venueApproval/routes');
const smartCouponsRoutes = require('./modules/smartCoupons/routes');
const punchCardsRoutes = require('./modules/punchCards/routes');
const smsCampaignsRoutes = require('./modules/smsCampaigns/routes');
const taxInvoicesRoutes = require('./modules/taxInvoices/routes');
const analyticsPublicRoutes = require('./modules/analytics/routes');
const contentCenterRoutes = require('./modules/contentCenter/routes');
const shiftsRoutes = require('./modules/shifts/routes');
const dbBackupRoutes = require('./modules/dbBackup/routes');
const waiterCallsRoutes = require('./modules/waiterCalls/routes');
const socialPostsRoutes = require('./modules/socialPosts/routes');

const app = express();

// Behind a reverse proxy in production, trust the first hop so req.ip (used by
// the rate limiters and session logging) reflects the real client, not the LB.
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, …).
// CORP is relaxed so the frontend origin can embed /uploads images; CSP is
// disabled because this server only returns JSON + static images, never HTML.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(ipBlocklistMiddleware);
app.use(express.json({ limit: '1mb' }));
// Payment gateways (e.g. Saman/SEP) POST their callback as a standard HTML
// form submission, not JSON — needed to read req.body.RefNum/State/etc.
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use('/api', apiRateLimiter);
app.use('/uploads', express.static(path.resolve(__dirname, '../', config.uploadDir)));

app.get('/', async (req, res, next) => {
  try {
    const status = await getSystemStatus();
    const items = [
      { label: 'Status', value: 'Online', tone: 'ok', icon: 'pulse' },
      { label: 'Transport', value: status.ssl ? 'HTTPS (SSL Enabled)' : 'HTTP', tone: status.ssl ? 'ok' : 'warn', icon: 'lock' },
      { label: 'Database', value: status.dbConnected ? 'Connected' : 'Disconnected', tone: status.dbConnected ? 'ok' : 'err', icon: 'database' },
      { label: 'Environment', value: status.env, icon: 'server' },
      { label: 'Uptime', value: status.uptimeLabel, icon: 'clock' },
      { label: 'CORS Policy', value: `Locked to ${status.corsOrigins.length} origin(s)`, tone: 'ok', icon: 'shield' },
    ];
    const links = [
      { href: '/api', label: '/api' },
      { href: '/health', label: '/health' },
    ];
    sendStatus(req, res, {
      json: { name: 'ET-Cafe Platform API', status: 'online', ...status },
      html: () =>
        renderStatusPage({
          title: 'ET-Cafe Platform API',
          subtitle: 'Backend is running and ready for client connections.',
          tone: status.dbConnected ? 'ok' : 'err',
          items,
          links,
        }),
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api', async (req, res, next) => {
  try {
    const status = await getSystemStatus();
    const groups = [
      'Auth', 'Venues', 'Menu', 'Orders', 'Payments', 'Wallet', 'Loyalty',
      'Admin', 'Reports', 'Support', 'Notifications', 'SMS Campaigns',
    ];
    sendStatus(req, res, {
      json: { name: 'ET-Cafe API', version: 'v1', status: 'online', endpointGroups: groups },
      html: () =>
        renderStatusPage({
          title: 'API Root',
          subtitle: 'This server exposes a JSON REST API under /api/*. No browsable docs are served here — use the endpoints directly or point your client at one of the groups below.',
          tone: 'ok',
          items: groups.map((g) => ({ label: 'Group', value: g, icon: 'api' })),
          links: [
            { href: '/', label: '← Overview' },
            { href: '/health', label: '/health' },
          ],
        }),
    });
  } catch (err) {
    next(err);
  }
});

app.get('/health', async (req, res, next) => {
  try {
    const status = await getSystemStatus();
    const code = status.dbConnected ? 200 : 503;
    sendStatus(req, res, {
      code,
      json: {
        status: status.dbConnected ? 'ok' : 'error',
        db: status.dbConnected ? 'connected' : 'disconnected',
        uptimeSeconds: status.uptimeSeconds,
        timestamp: status.timestamp,
      },
      html: () =>
        renderStatusPage({
          title: 'Health Check',
          subtitle: status.dbConnected ? 'All systems operational.' : 'Database connection is currently down.',
          tone: status.dbConnected ? 'ok' : 'err',
          code,
          items: [
            { label: 'Database', value: status.dbConnected ? 'Connected' : 'Disconnected', tone: status.dbConnected ? 'ok' : 'err', icon: 'database' },
            { label: 'Uptime', value: status.uptimeLabel, icon: 'clock' },
            { label: 'Memory', value: `${status.memoryMb} MB`, icon: 'cpu' },
            { label: 'Node', value: status.nodeVersion, icon: 'server' },
          ],
          links: [{ href: '/', label: '← Overview' }],
        }),
    });
  } catch (err) {
    next(err);
  }
});

app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const { listVenues } = require('./modules/venues/service');
    const venues = await listVenues({ publicOnly: true });
    const staticUrls = ['/', '/login', '/register'];

    const urls = [
      ...staticUrls.map((path) => `  <url><loc>${config.siteUrl}${path}</loc><changefreq>weekly</changefreq></url>`),
      ...venues.map(
        (v) =>
          `  <url><loc>${config.siteUrl}/menu/${v.id}</loc><changefreq>daily</changefreq><lastmod>${new Date(
            v.updatedAt || v.createdAt
          ).toISOString()}</lastmod></url>`
      ),
    ];

    res.setHeader('Content-Type', 'application/xml');
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
        '\n'
      )}\n</urlset>`
    );
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/venues/:venueId/staff', staffRoutes);
app.use('/api/admin/staff', platformStaffRoutes);
app.use('/api/content', contentRoutes.publicRouter);
app.use('/api/admin/content', contentRoutes.adminRouter);
app.use('/api/admin/integrations', integrationsRoutes);
app.use('/api/admin/reports', reportsRoutes);
app.use('/api/table-sessions', tableSessionRoutes);
app.use('/api/cart', savedCartRoutes);
app.use('/api/orders/:id/shares', billShareRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/venues/:venueId/forecast', forecastingRoutes);
app.use('/api/venues/:venueId/inventory', inventoryRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/admin/bi', biRoutes);
app.use('/api/admin/platform-accounting', platformAccountingRoutes);
app.use('/api/admin/fraud', fraudRoutes);
app.use('/api/admin/tickets', internalTicketRoutes);
app.use('/api/cities', citiesRoutes);
app.use('/api/venues/:venueId/happy-hour', happyHourRoutes);
app.use('/api/venues/:venueId/reservations', reservationsRoutes);
app.use('/api/venues/:venueId/crm', venueCrmRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/admin/roles', customRolesRoutes);
app.use('/api/admin/notifications', adminNotificationsRoutes);
app.use('/api/admin/venue-health', venueHealthRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/venues/:venueId/api-keys', apiKeysRoutes);
app.use('/api/venues/:venueId/webhooks', webhooksRoutes);
app.use('/api/venues/:venueId/financial-reports', financialReportsRoutes);
app.use('/api/admin/venues/:venueId/approval-stages', venueApprovalRoutes);
app.use('/api/venues/:venueId/smart-coupons', smartCouponsRoutes);
app.use('/api/venues/:venueId/punch-cards', punchCardsRoutes);
app.use('/api/punch-cards', punchCardsRoutes.mineRouter);
app.use('/api/admin/content-center', contentCenterRoutes);
app.use('/api/venues/:venueId/shifts', shiftsRoutes);
app.use('/api/admin/db-backup', dbBackupRoutes);
app.use('/api/waiter-calls', waiterCallsRoutes);
app.use('/api/venues/:venueId/sms-campaigns', smsCampaignsRoutes);
app.use('/api/sms-credit', smsCampaignsRoutes.verifyRouter);
app.use('/api/admin/sms-campaigns', smsCampaignsRoutes.adminRouter);
app.use('/api/venues/:venueId/tax-invoices', taxInvoicesRoutes);
app.use('/api/orders', taxInvoicesRoutes.downloadRouter);
app.use('/api/analytics-config', analyticsPublicRoutes);
app.use('/api/social', socialPostsRoutes);

app.use(notFoundHandler);

if (config.sentryDsn) {
  const Sentry = require('./instrument');
  Sentry.setupExpressErrorHandler(app);
}

app.use(errorHandler);

module.exports = app;
