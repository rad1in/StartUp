const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const refreshTtlToMs = (ttl) => {
  const match = /^(\d+)([smhd])$/.exec(ttl || '7d');
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * unitMs[match[2]];
};

const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Refuse to boot a production server with the placeholder JWT secrets — a
// known signing key means anyone can forge admin tokens.
if (process.env.NODE_ENV === 'production') {
  const weak = (s) => !s || s.length < 32 || /replace-with|default-secret|change-me/i.test(s);
  if (weak(process.env.JWT_SECRET) || weak(process.env.JWT_REFRESH_SECRET)) {
    throw new Error(
      'JWT_SECRET / JWT_REFRESH_SECRET must be set to long random values (32+ chars) in production.'
    );
  }
  if (weak(process.env.TICKET_ENCRYPTION_KEY)) {
    throw new Error('TICKET_ENCRYPTION_KEY must be set to a long random value (32+ chars) in production.');
  }
}

const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  ssl: {
    enabled: String(process.env.SSL_ENABLED || 'false').toLowerCase() === 'true',
    keyPath: process.env.SSL_KEY_PATH || '',
    certPath: process.env.SSL_CERT_PATH || '',
    caPath: process.env.SSL_CA_PATH || '',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '600', 10),
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10),
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'qr_ordering',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: jwtRefreshExpiresIn,
    refreshExpiresInMs: refreshTtlToMs(jwtRefreshExpiresIn),
  },
  // Separate key from JWT_SECRET on purpose — a leaked signing key shouldn't
  // also unlock every "confidential" support ticket ever stored at rest.
  ticketEncryptionKey: process.env.TICKET_ENCRYPTION_KEY || 'default-ticket-encryption-key-change-me',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  backupDir: process.env.BACKUP_DIR || 'backups',
  // Windows dev machines in this project use a local XAMPP install, hence
  // that default on win32; anywhere else (real Linux/macOS servers) fall
  // back to the bare command name and rely on PATH — set MYSQLDUMP_PATH/
  // MYSQL_CLI_PATH explicitly if that's not where your server finds them.
  mysqldumpPath:
    process.env.MYSQLDUMP_PATH || (process.platform === 'win32' ? 'C:\\xampp\\mysql\\bin\\mysqldump.exe' : 'mysqldump'),
  mysqlCliPath:
    process.env.MYSQL_CLI_PATH || (process.platform === 'win32' ? 'C:\\xampp\\mysql\\bin\\mysql.exe' : 'mysql'),
  // Comma-separated list; default covers the web frontend (5173) and the
  // Expo web build of the mobile app (8081). Native mobile requests send no
  // Origin header, so they are unaffected by CORS entirely.
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8081').split(','),
  socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
  // Public web frontend origin, used to build absolute URLs in the sitemap.
  siteUrl: process.env.SITE_URL || 'http://localhost:5173',
  // Public URL of THIS backend's own API — used for gateways (like Saman)
  // that POST their callback straight to a server endpoint rather than
  // redirecting the browser to a frontend page (AqayePardakht's flow).
  apiUrl: process.env.API_URL || `http://localhost:${parseInt(process.env.PORT || '4000', 10)}/api`,
  smsProvider: process.env.SMS_PROVIDER || 'mock',
  sms: {
    melipayamakOtpToken: process.env.MELIPAYAMAK_OTP_TOKEN || '',
  },
  emailProvider: process.env.EMAIL_PROVIDER || 'mock',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:support@et-cafe.local',
  },
  neshanApiKey: process.env.NESHAN_API_KEY || '',
  neshanServiceKey: process.env.NESHAN_SERVICE_KEY || '',
  // AI-powered auto-translation (GapGPT, an OpenAI-compatible proxy) — silently
  // translates venue-owner-entered Persian content (menu items, categories,
  // venue profile) into the platform's other customer-facing languages.
  gapgpt: {
    apiKey: process.env.GAPGPT_API_KEY || '',
    baseUrl: process.env.GAPGPT_BASE_URL || 'https://api.gapgpt.app/v1',
    model: process.env.GAPGPT_MODEL || 'gpt-4o',
  },
  nodeEnv: process.env.NODE_ENV || 'development',
  // Crash/error monitoring (Sentry) — entirely optional, only active when a DSN
  // is set, so local dev never sends anything anywhere by default.
  sentryDsn: process.env.SENTRY_DSN || '',
  // CDN/WAF (Parspack) — powers lib/parspackCdn.js. Blank disables it entirely.
  parspackCdn: {
    apiKey: process.env.PARSPACK_CDN_API_KEY || '',
    zoneUuid: process.env.PARSPACK_CDN_ZONE_UUID || '',
  },
  loyalty: {
    // Points earned per 10,000 Toman spent when a venue doesn't set its own rate.
    defaultPointsRate: parseFloat(process.env.LOYALTY_DEFAULT_POINTS_RATE || '1'),
    // Toman value of a single redeemed loyalty point.
    pointRedemptionValue: parseFloat(process.env.LOYALTY_POINT_VALUE || '1000'),
  },
};

module.exports = { config };
