const { pool } = require('../../lib/db');

// The list is static reference data (~1,600 rows) — cache it in memory after
// the first read so the city picker never hits the DB per keystroke.
let cache = null;

async function getAll() {
  if (cache) return cache;

  const [rows] = await pool.query(
    "SELECT id, type, name, slug, lat, lng, provinceId FROM `City` ORDER BY FIELD(type, 'province', 'county', 'city'), name"
  );

  const provinces = [];
  const cities = [];
  for (const row of rows) {
    const entry = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      lat: Number(row.lat),
      lng: Number(row.lng),
    };
    if (row.type === 'province') {
      provinces.push(entry);
    } else {
      // Counties are the major cities (شهرستان centers); plain cities are the
      // smaller towns — the picker treats both as selectable cities.
      cities.push({ ...entry, provinceId: row.provinceId, major: row.type === 'county' });
    }
  }

  cache = { provinces, cities };
  return cache;
}

module.exports = { getAll };
