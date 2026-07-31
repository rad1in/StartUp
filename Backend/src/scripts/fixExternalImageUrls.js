// One-off: the demo seed scripts (seed.js/seedMultiCity.js/seedShowcase.js)
// used to point Venue.coverImageUrl at images.unsplash.com. That host is
// unreachable from this deployment's network — real visitors were seeing
// broken-image icons, and it also tanked the Lighthouse performance/
// best-practices score (failed network requests + console errors). The seed
// scripts themselves now generate a placehold.co URL instead (see
// db/placeholderImage.js); this script repoints any *already-seeded* rows
// that still have the old unsplash.com URLs. Safe to re-run.
//
// Usage: node src/scripts/fixExternalImageUrls.js
const { pool } = require('../lib/db');
const { placeholderCoverUrl } = require('../db/placeholderImage');

async function main() {
  const [rows] = await pool.query(
    "SELECT id, name, coverImageUrl FROM `Venue` WHERE coverImageUrl LIKE '%unsplash.com%'"
  );

  console.log(`${rows.length} venue(s) with an unreachable unsplash.com coverImageUrl found.`);

  for (const row of rows) {
    const newUrl = placeholderCoverUrl(row.name);
    await pool.query('UPDATE `Venue` SET coverImageUrl = ? WHERE id = ?', [newUrl, row.id]);
    console.log(`  ✓ ${row.name} (${row.id}) -> ${newUrl}`);
  }

  await pool.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
