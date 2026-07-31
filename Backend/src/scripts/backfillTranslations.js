// One-off migration: translates every Venue/Category/MenuItem row that is
// missing an AI translation (see lib/autoTranslate.js) — mainly demo/seed
// data inserted directly via SQL in db/seed.js, which bypasses
// scheduleTranslation entirely, plus any real content saved before
// GAPGPT_API_KEY was configured. Safe to re-run — rows that already have
// translations for all TARGET_LANGS are skipped. New content going forward
// (real venue-owner saves) already triggers translation on its own, and the
// same self-heal path in autoTranslate.js will also lazily backfill any row
// this script misses the moment a customer views it in a non-Persian
// language, so this script is a convenience for translating everything
// up front rather than waiting for that.
//
// Usage: node src/scripts/backfillTranslations.js
const { pool } = require('../lib/db');
const { scheduleTranslation, TARGET_LANGS } = require('../lib/autoTranslate');
const { config } = require('../config/config');

const TARGETS = [
  { table: 'Venue', fields: ['name', 'description'] },
  { table: 'Category', fields: ['name'] },
  { table: 'MenuItem', fields: ['name', 'description', 'tags'] },
];

function isFullyTranslated(translationsJson) {
  if (!translationsJson) return false;
  let translations;
  try {
    translations = typeof translationsJson === 'string' ? JSON.parse(translationsJson) : translationsJson;
  } catch {
    return false;
  }
  return TARGET_LANGS.every((lang) => translations[lang] && Object.keys(translations[lang]).length > 0);
}

// GapGPT is called sequentially (not in parallel) to stay well under any
// rate limit on the account — this is a one-off script, not latency-sensitive.
async function processTarget({ table, fields }) {
  const [rows] = await pool.query(`SELECT id, translations, ${fields.map((f) => `\`${f}\``).join(', ')} FROM \`${table}\``);

  let translated = 0;
  let skippedComplete = 0;
  let skippedEmpty = 0;
  let failed = 0;

  for (const row of rows) {
    if (isFullyTranslated(row.translations)) {
      skippedComplete++;
      continue;
    }
    const source = {};
    for (const field of fields) {
      if (row[field]) source[field] = row[field];
    }
    if (Object.keys(source).length === 0) {
      skippedEmpty++;
      continue;
    }
    try {
      // scheduleTranslation swallows its own errors (by design, for its
      // fire-and-forget call sites elsewhere) — it always resolves, so
      // success is checked by re-reading the row rather than catching a
      // rejection. The re-check query itself can still throw on a transient
      // connection drop over a long run, hence the try/catch around both —
      // one bad row must not abort every row after it.
      await scheduleTranslation(table, row.id, source);
      const [[after]] = await pool.query(`SELECT translations FROM \`${table}\` WHERE id = ?`, [row.id]);
      if (isFullyTranslated(after?.translations)) {
        translated++;
      } else {
        failed++;
        console.error(`  ✗ ${table} id=${row.id}: translation did not complete (see [autoTranslate] log above)`);
      }
    } catch (err) {
      failed++;
      console.error(`  ✗ ${table} id=${row.id}: ${err.message}`);
    }
  }

  console.log(
    `${table}: ${rows.length} scanned, ${translated} translated, ${skippedComplete} already complete, ${skippedEmpty} had no source text, ${failed} failed.`
  );
}

async function main() {
  if (!config.gapgpt.apiKey) {
    console.error('GAPGPT_API_KEY is not set — nothing to do. Set it in backend/.env first.');
    process.exit(1);
  }
  console.log('Backfilling AI translations (GapGPT)...\n');
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
