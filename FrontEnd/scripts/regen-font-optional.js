// Regenerates src/styles/vazirmatn-optional.css from the installed
// @fontsource/vazirmatn package. Re-run this after bumping the @fontsource/
// vazirmatn version, in case upstream added/changed weights or files.
// Usage: node scripts/regen-font-optional.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WEIGHTS = ['400', '500', '700', '800', '900'];
const OUT_PATH = path.join(__dirname, '..', 'src', 'styles', 'vazirmatn-optional.css');

const HEADER = `/* Auto-generated from @fontsource/vazirmatn — DO NOT hand-edit.
 * Same font-face rules as the package's own per-weight CSS, except
 * font-display is "optional" instead of "swap": the browser only swaps in
 * the webfont if it's already cached/ready almost immediately, otherwise it
 * just keeps the fallback font for this page view (and caches the webfont
 * for next time) instead of swapping mid-render and shifting layout — this
 * is what was causing the CLS flagged by Lighthouse.
 * Regenerate with: node scripts/regen-font-optional.js
 */
`;

let out = HEADER + '\n';
for (const weight of WEIGHTS) {
  const srcPath = path.join(__dirname, '..', 'node_modules', '@fontsource', 'vazirmatn', `${weight}.css`);
  const css = fs.readFileSync(srcPath, 'utf8');
  out +=
    css
      .replace(/font-display: swap;/g, 'font-display: optional;')
      .replace(/url\(\.\/files\//g, 'url(@fontsource/vazirmatn/files/') + '\n';
}

fs.writeFileSync(OUT_PATH, out);
console.log(`Wrote ${OUT_PATH} (${out.length} bytes)`);
