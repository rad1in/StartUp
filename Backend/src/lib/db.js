const mysql = require('mysql2/promise');
const { config } = require('../config/config');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  // Without TCP keep-alive, an idle pooled connection can be silently
  // dropped (by the OS, a NAT, or MySQL's own wait_timeout) without either
  // side noticing — the next query on that connection then fails with
  // ECONNRESET instead of transparently reconnecting. This affected both
  // background cron jobs (processDueBroadcasts, checkMarginAlerts, etc.)
  // and real request handlers hitting a long-idle connection from the pool.
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

module.exports = { pool };
