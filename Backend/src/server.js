// Must be the very first require so Sentry can instrument every module
// required after it.
require('./instrument');

const fs = require('fs');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const app = require('./app');
const { config } = require('./config/config');
const { pool } = require('./lib/db');
const { initSockets } = require('./sockets');
const { processDueBroadcasts } = require('./modules/admin/service');
const { processDueReports } = require('./modules/financialReports/service');
const { processAllVenues: processSmartCoupons } = require('./modules/smartCoupons/service');
const { runScheduledBackupIfDue } = require('./modules/dbBackup/service');
const { checkMarginAlerts } = require('./modules/inventory/service');
const { processDueReviewReminders } = require('./modules/orders/service');

// Optional HTTPS: set SSL_ENABLED=true + SSL_KEY_PATH/SSL_CERT_PATH (and
// optionally SSL_CA_PATH for an intermediate chain) in .env. Left off by
// default because most deployments terminate TLS at a reverse proxy/load
// balancer in front of this process — only enable this when Node itself
// needs to speak TLS directly (e.g. no proxy in front of it).
let server;
if (config.ssl.enabled) {
  const sslOptions = {
    key: fs.readFileSync(config.ssl.keyPath),
    cert: fs.readFileSync(config.ssl.certPath),
    ca: config.ssl.caPath ? fs.readFileSync(config.ssl.caPath) : undefined,
  };
  server = https.createServer(sslOptions, app);
} else {
  server = http.createServer(app);
}

const io = new Server(server, {
  cors: { origin: config.socketCorsOrigin, credentials: true },
});

initSockets(io);

// Sends any scheduled broadcast whose time has arrived — checked once a
// minute rather than a real cron since this is a single-instance deployment.
const backgroundIntervals = [
  setInterval(() => {
    processDueBroadcasts().catch((err) => console.error('processDueBroadcasts failed', err));
  }, 60 * 1000),

  // Same once-a-minute poll pattern — venues due for their weekly/monthly
  // financial report snapshot (checked against lastGeneratedAt) get one generated.
  setInterval(() => {
    processDueReports().catch((err) => console.error('processDueReports failed', err));
  }, 60 * 1000),

  // Smart coupon engine: at most once a day per venue (guarded by lastRunAt
  // inside processAllVenues), checked on the same once-a-minute poll.
  setInterval(() => {
    processSmartCoupons().catch((err) => console.error('processSmartCoupons failed', err));
  }, 60 * 1000),

  // Automated daily database backup — runs the same once-a-minute poll as the
  // other scheduled jobs, but only actually dumps once 24h have passed since
  // the last backup (see runScheduledBackupIfDue).
  setInterval(() => {
    runScheduledBackupIfDue().catch((err) => console.error('runScheduledBackupIfDue failed', err));
  }, 60 * 1000),

  // Menu item margin-drop alerts — same once-a-minute poll, self-throttled to
  // at most one alert per item per 24h (see checkMarginAlerts).
  setInterval(() => {
    checkMarginAlerts().catch((err) => console.error('checkMarginAlerts failed', err));
  }, 60 * 1000),

  // Prompts a customer to review their order ~30 min after it's served — same
  // once-a-minute poll, self-throttled per order (see processDueReviewReminders).
  setInterval(() => {
    processDueReviewReminders().catch((err) => console.error('processDueReviewReminders failed', err));
  }, 60 * 1000),
];

server.listen(config.port, () => {
  const protocol = config.ssl.enabled ? 'https' : 'http';
  console.log(`Backend server listening on ${protocol}://localhost:${config.port}`);
  console.log(`CORS locked to: ${config.corsOrigin.join(', ')}`);
});

// Graceful shutdown: stop accepting new connections, let in-flight requests
// finish, then close the DB pool — avoids dropped requests and orphaned
// connections on deploys/restarts instead of the process just vanishing.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received — shutting down gracefully.`);

  backgroundIntervals.forEach(clearInterval);

  server.close(() => {
    pool
      .end()
      .catch(() => {})
      .finally(() => process.exit(0));
  });

  // Don't hang forever waiting for stubborn open connections (e.g. an idle
  // websocket) — force-exit after a grace period.
  setTimeout(() => process.exit(1), 10 * 1000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
