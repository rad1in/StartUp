/**
 * Guard for the fa-IR -> useLanguage() migration.
 *
 * The codemod rewrites call sites to n() / date() / dateShort(), but those
 * helpers only exist if the *enclosing component* destructured them from
 * useLanguage(). A file often defines several components, each with its own
 * hook call, so widening only the first one leaves the others throwing
 * ReferenceError at runtime — and nothing in `npm run build` catches it,
 * because it's a runtime lookup, not a static import.
 *
 * This walks each top-level function component, collects what it destructured,
 * and reports any helper used without being in scope.
 *
 * Usage: node scripts/check-locale-scope.js "src/**\/*.jsx"
 */
const fs = require('fs');
const path = require('path');

const HELPERS = ['n', 'date', 'dateShort', 'timeShort'];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

// Split a file into [componentName, startLine, endLine] using top-level
// `function X(` declarations — good enough here because this codebase declares
// every component that way (verified across src/).
function components(lines) {
  const marks = [];
  lines.forEach((line, i) => {
    const m = /^(?:export\s+default\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/.exec(line);
    if (m) marks.push({ name: m[1], start: i, params: m[2] });
  });
  return marks.map((mk, i) => ({
    ...mk,
    end: i + 1 < marks.length ? marks[i + 1].start : lines.length,
  }));
}

let problems = 0;
for (const file of walk('src')) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (const comp of components(lines)) {
    const body = lines.slice(comp.start, comp.end);
    const hookLine = body.find((l) => l.includes('useLanguage()'));
    const declared = new Set();
    if (hookLine) {
      const m = /const\s*\{([^}]*)\}\s*=\s*useLanguage\(\)/.exec(hookLine);
      if (m) m[1].split(',').forEach((s) => declared.add(s.trim().split(':')[0].trim()));
    }
    // A plain helper (e.g. `function priceLabel(value, t, n)`) can receive a
    // helper as a parameter instead of pulling it from useLanguage() itself —
    // the established pattern for non-component functions in this codebase.
    for (const helper of HELPERS) {
      if (new RegExp(`(^|[,{\\s])${helper}(\\s*[,}]|\\s*$)`).test(comp.params)) declared.add(helper);
    }
    for (const helper of HELPERS) {
      const used = body.some((l, idx) => {
        if (comp.start + idx === comp.start && l.includes('useLanguage()')) return false;
        if (l.includes('useLanguage()')) return false;
        return new RegExp(`(^|[^\\w$.'"])${helper}\\(`).test(l);
      });
      if (used && !declared.has(helper)) {
        console.log(`${file}:${comp.start + 1}  ${comp.name}() uses ${helper}() but does not destructure it`);
        problems++;
      }
    }
  }
}
console.log(problems === 0 ? 'OK — every helper is in scope.' : `${problems} scope problem(s) found.`);
process.exit(problems === 0 ? 0 : 1);
