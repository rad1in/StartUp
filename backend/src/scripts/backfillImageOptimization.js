// One-off migration: re-encodes every image uploaded *before* the WebP
// optimization pipeline existed (see lib/upload.js) into a small WebP file,
// using the same per-use-case preset the live upload routes use, then
// repoints the owning DB row at the new file and deletes the original.
// Safe to re-run — anything already ending in .webp is skipped.
//
// Usage: node src/scripts/backfillImageOptimization.js
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const sharp = require('sharp');
const { pool } = require('../lib/db');
const { config } = require('../config/config');

const PRESETS = {
  square: { width: 512, height: 512, quality: 75 },
  wide: { width: 1600, height: 900, quality: 78 },
  menu: { width: 1200, height: 1200, quality: 78 },
};

// Every DB column that stores an uploaded (as opposed to externally-hosted,
// e.g. seeded Unsplash) image URL, paired with the preset its live upload
// route uses.
const TARGETS = [
  { table: 'User', idColumn: 'id', column: 'avatarUrl', preset: 'square' },
  { table: 'User', idColumn: 'id', column: 'coverImageUrl', preset: 'wide' },
  { table: 'Venue', idColumn: 'id', column: 'logoUrl', preset: 'square' },
  { table: 'Venue', idColumn: 'id', column: 'coverImageUrl', preset: 'wide' },
  { table: 'MenuItem', idColumn: 'id', column: 'imageUrl', preset: 'menu' },
  { table: 'Combo', idColumn: 'id', column: 'imageUrl', preset: 'menu' },
];

const uploadsRoot = path.resolve(__dirname, '../../', config.uploadDir);

async function processTarget({ table, idColumn, column, preset }) {
  const [rows] = await pool.query(
    `SELECT \`${idColumn}\` AS id, \`${column}\` AS url FROM \`${table}\` ` +
      `WHERE \`${column}\` IS NOT NULL AND \`${column}\` != '' AND \`${column}\` NOT LIKE '%.webp'`
  );

  let converted = 0;
  let skippedExternal = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.url.startsWith('/uploads/')) {
      skippedExternal++; // e.g. a seeded Unsplash URL — nothing local to optimize
      continue;
    }
    const relativePath = row.url.slice('/uploads/'.length);
    const absolutePath = path.resolve(uploadsRoot, relativePath);
    if (!fs.existsSync(absolutePath)) continue;

    try {
      const { width, height, quality } = PRESETS[preset];
      const dir = path.dirname(absolutePath);
      const filename = `${randomUUID()}.webp`;
      const outputPath = path.join(dir, filename);

      await sharp(absolutePath)
        .rotate()
        .resize({ width, height, fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toFile(outputPath);

      const newUrl = `/uploads/${path.relative(uploadsRoot, outputPath).split(path.sep).join('/')}`;
      await pool.query(`UPDATE \`${table}\` SET \`${column}\` = ? WHERE \`${idColumn}\` = ?`, [newUrl, row.id]);
      fs.unlinkSync(absolutePath);
      converted++;
    } catch (err) {
      failed++;
      console.error(`  ✗ ${table}.${column} id=${row.id}: ${err.message}`);
    }
  }

  console.log(
    `${table}.${column}: ${rows.length} scanned, ${converted} converted, ${skippedExternal} external (skipped), ${failed} failed.`
  );
}

async function main() {
  console.log('Backfilling image optimization (WebP conversion + resize)...\n');
  for (const target of TARGETS) {
    await processTarget(target);
  }
  await pool.end();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
