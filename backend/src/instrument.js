// Must be required before any other module (see server.js) so Sentry can
// instrument everything else that gets required afterward.
const Sentry = require('@sentry/node');
const { config } = require('./config/config');

if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    tracesSampleRate: config.nodeEnv === 'production' ? 0.2 : 1.0,
  });
}

module.exports = Sentry;
