const { pool } = require('./db');
const { translateFields } = require('./translate');

const TARGET_LANGS = ['en', 'ar', 'tr'];

// Fire-and-forget: translates `fields` (Persian source values, as entered by
// the venue owner) and merges the result into the row's `translations` JSON
// column. Never throws — errors are only logged, since this is a silent
// background enhancement. The venue owner's save request must never wait on
// this or be able to fail because of it. Returns the underlying promise so
// callers that need to know when it settles (e.g. the self-heal path below)
// can await/finally it — callers that don't care can simply ignore it.
function scheduleTranslation(table, id, fields) {
  return translateFields(fields, TARGET_LANGS)
    .then(async (translations) => {
      if (Object.keys(translations).length === 0) return;
      const [rows] = await pool.query(`SELECT translations FROM \`${table}\` WHERE id = ?`, [id]);
      let existing = {};
      try {
        existing = rows[0]?.translations ? JSON.parse(rows[0].translations) : {};
      } catch {
        existing = {};
      }
      const merged = { ...existing };
      for (const lang of Object.keys(translations)) {
        merged[lang] = { ...(merged[lang] || {}), ...translations[lang] };
      }
      await pool.query(`UPDATE \`${table}\` SET translations = ? WHERE id = ?`, [JSON.stringify(merged), id]);
    })
    .catch((err) => {
      console.error(`[autoTranslate] ${table}#${id} translation failed:`, err.message);
    });
}

// Rows missing a translation currently being generated, so concurrent
// requests for the same row (e.g. several customers viewing a popular venue
// at once) don't each fire their own duplicate GapGPT call.
const healInFlight = new Set();

// Self-heals rows that were never translated — demo/seed data inserted
// directly via SQL (bypassing scheduleTranslation entirely), content saved
// before GAPGPT_API_KEY was configured, or a past translation call that
// failed and was only logged. Rather than requiring a one-off backfill to be
// remembered and re-run, the first customer request for a language a row
// doesn't have yet quietly kicks off translation from the row's own current
// text, so the next viewer (in any target language) gets it.
function scheduleHeal(table, row, lang, fields) {
  if (!table || !TARGET_LANGS.includes(lang)) return;
  const key = `${table}:${row.id}`;
  if (healInFlight.has(key)) return;
  const source = {};
  for (const field of fields) {
    if (row[field]) source[field] = row[field];
  }
  if (Object.keys(source).length === 0) return;
  healInFlight.add(key);
  scheduleTranslation(table, row.id, source).finally(() => healInFlight.delete(key));
}

// Applies a stored translation onto a row for display, and always strips the
// raw `translations` JSON blob from what's returned to any client (owner or
// customer) — it's an internal implementation detail, never something either
// side should see. `lang` is the viewer's selected UI language; 'fa' (or
// unset) returns the original venue-owner-entered text untouched. Pass
// `table` (the row's own table name) to enable the self-heal behavior above
// for viewer-facing reads; omit it for internal/management reads that
// shouldn't trigger background translation work.
function applyTranslation(row, lang, fields, table) {
  if (!row) return row;
  const out = { ...row };
  delete out.translations;
  if (!lang || lang === 'fa') return out;

  let translations = {};
  if (row.translations) {
    try {
      translations = typeof row.translations === 'string' ? JSON.parse(row.translations) : row.translations;
    } catch {
      translations = {};
    }
  }
  const t = translations[lang];
  if (!t) {
    scheduleHeal(table, row, lang, fields);
    return out;
  }
  for (const field of fields) {
    if (t[field]) out[field] = t[field];
  }
  return out;
}

function applyTranslationToList(rows, lang, fields, table) {
  return rows.map((row) => applyTranslation(row, lang, fields, table));
}

// A venue's own owner/staff (or platform admin staff) must always see their
// real, original Persian text when managing their venue/menu — never an AI
// translation — otherwise editing and re-saving would silently overwrite
// their actual content with a translated copy. Only true outside viewers
// (customers, or anonymous requests) ever get the `lang` query param honored.
const ADMIN_TEAM_ROLES = ['SUPER_ADMIN', 'SUPPORT_STAFF', 'FINANCE_STAFF'];
function isManagementContext(req, venueId) {
  if (!req.user) return false;
  if (req.user.venueId && req.user.venueId === venueId) return true;
  return ADMIN_TEAM_ROLES.includes(req.user.role);
}

module.exports = {
  scheduleTranslation,
  applyTranslation,
  applyTranslationToList,
  isManagementContext,
  TARGET_LANGS,
};
