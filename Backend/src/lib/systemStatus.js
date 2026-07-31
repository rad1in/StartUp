const { pool } = require('./db');
const { config } = require('../config/config');

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

async function checkDb() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function getSystemStatus() {
  const dbOk = await checkDb();
  const mem = process.memoryUsage();
  return {
    env: config.nodeEnv,
    uptimeSeconds: Math.floor(process.uptime()),
    uptimeLabel: formatUptime(process.uptime()),
    nodeVersion: process.version,
    ssl: config.ssl.enabled,
    corsOrigins: config.corsOrigin,
    dbConnected: dbOk,
    memoryMb: Math.round(mem.rss / 1024 / 1024),
    timestamp: new Date().toISOString(),
  };
}

module.exports = { getSystemStatus, formatUptime };
