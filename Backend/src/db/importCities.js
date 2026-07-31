// Imports Iran's provinces/counties/cities from data/cities.sql (Divar-style
// dump: id, type, name, slug, "lng,lat" coordinates, province id) into the
// `City` table. Idempotent — creates the table if missing and upserts rows.
// Run with: node src/db/importCities.js
const fs = require('fs');
const path = require('path');
const { pool } = require('../lib/db');

const DATA_FILE = path.join(__dirname, 'data', 'cities.sql');

const ROW_RE =
  /VALUES \((\d+), '(province|county|city)', '([^']*)', '([^']*)', '([^']*)', (\d+)\)/;

async function main() {
  const sql = fs.readFileSync(DATA_FILE, 'utf8');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`City\` (
      \`id\` INT NOT NULL,
      \`type\` ENUM('province','county','city') NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`slug\` VARCHAR(255) NOT NULL,
      \`lat\` DECIMAL(11, 8) NOT NULL,
      \`lng\` DECIMAL(11, 8) NOT NULL,
      \`provinceId\` INT NOT NULL DEFAULT 0,
      PRIMARY KEY (\`id\`, \`type\`),
      INDEX \`idx_city_type\` (\`type\`),
      INDEX \`idx_city_province\` (\`provinceId\`),
      INDEX \`idx_city_name\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const rows = [];
  for (const line of sql.split('\n')) {
    const match = line.match(ROW_RE);
    if (!match) continue;
    const [, id, type, name, slug, coordinates, provinceId] = match;
    const [lng, lat] = coordinates.split(',').map(Number);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    rows.push([Number(id), type, name, slug, lat, lng, Number(provinceId)]);
  }

  if (rows.length === 0) throw new Error('هیچ ردیفی در فایل شهرها پیدا نشد.');

  // Batch upsert in chunks to keep packets small.
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
    await pool.query(
      `INSERT INTO \`City\` (id, type, name, slug, lat, lng, provinceId) VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug), lat = VALUES(lat), lng = VALUES(lng), provinceId = VALUES(provinceId)`,
      chunk.flat()
    );
  }

  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM `City`');
  console.log(`ورود شهرها کامل شد: ${rows.length} ردیف پردازش شد، ${total} ردیف در جدول City.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
