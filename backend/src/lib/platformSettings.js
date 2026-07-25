const { pool } = require('./db');

async function getSetting(key, fallback = null) {
  const [rows] = await pool.query('SELECT value FROM `PlatformSetting` WHERE `key` = ?', [key]);
  if (rows.length === 0) return fallback;
  const raw = rows[0].value;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

async function setSetting(key, value) {
  // MariaDB's JSON type is a TEXT alias with a validity check — a plain JSON
  // string parameter is accepted directly, no CAST(... AS JSON) needed (and
  // that cast target isn't supported on MariaDB).
  await pool.query(
    `INSERT INTO \`PlatformSetting\` (\`key\`, value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    [key, JSON.stringify(value)]
  );
  return getSetting(key);
}

module.exports = { getSetting, setSetting };
