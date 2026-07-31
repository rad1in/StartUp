// Branded, dark-luxe (gold/charcoal, matching the ET-Cafe frontend theme)
// HTML status-page renderer, shared by every top-level "meta" route (/, /api,
// /health) and the 404/500 handlers. One template keeps their look identical
// instead of each route hand-rolling its own inline HTML.
const COLORS = {
  bg: '#0F0D0A',
  panel: '#1A1712',
  panelSoft: '#211D16',
  border: 'rgba(229,196,118,0.14)',
  borderStrong: 'rgba(229,196,118,0.28)',
  ink: '#F7F4EC',
  muted: '#9C9484',
  gold: '#E5C476',
  goldSoft: '#F0DCA8',
  goldDeep: '#C9922F',
  ok: '#6FCF97',
  warn: '#E5C476',
  err: '#EB6F6F',
};

const TONE_BG = {
  ok: 'rgba(111,207,151,0.12)',
  warn: 'rgba(229,196,118,0.12)',
  err: 'rgba(235,111,111,0.12)',
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Minimal feather-style outline icons (24x24, stroke-based) — kept inline so
// the page never depends on an external icon font/CDN.
const ICONS = {
  pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  shield: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.5 4.5l2.5 2.5M17 17l2.5 2.5M19.5 4.5L17 7M7 17l-2.5 2.5"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="1.5"/><path d="M8 10V7a4 4 0 018 0v3"/>',
  layers: '<path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
  alert: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4M12 17h.01"/>',
  x: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/>',
  api: '<path d="M4 17V7a2 2 0 012-2h5l2 2h5a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2z"/>',
};

function icon(name, color) {
  const paths = ICONS[name] || ICONS.layers;
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function toneIcon(tone) {
  if (tone === 'ok') return 'check';
  if (tone === 'err') return 'x';
  if (tone === 'warn') return 'alert';
  return 'pulse';
}

// tone: 'ok' | 'warn' | 'err' | undefined (neutral)
function renderStatusPage({ title, subtitle, tone = 'ok', items = [], links = [] }) {
  const toneColor = COLORS[tone] || COLORS.gold;
  const toneLabel = tone === 'ok' ? 'Online' : tone === 'err' ? 'Issue detected' : 'Notice';

  const itemsHtml = items
    .map((item) => {
      const itemColor = COLORS[item.tone] || COLORS.ink;
      const itemIcon = item.icon || (item.tone ? toneIcon(item.tone) : 'layers');
      return `
        <article class="item">
          <span class="item-icon" style="color:${itemColor}">${icon(itemIcon, itemColor)}</span>
          <div>
            <div class="k">${escapeHtml(item.label)}</div>
            <div class="v" style="color:${itemColor}">${escapeHtml(item.value)}</div>
          </div>
        </article>`;
    })
    .join('');

  const linksHtml = links.map((l) => `<a class="link" href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a>`).join('');

  return `<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>${escapeHtml(title)} — ET-Cafe API</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { height: 100%; }
      body {
        min-height: 100vh;
        font-family: 'Vazirmatn', 'Segoe UI', Tahoma, sans-serif;
        color: ${COLORS.ink};
        background: ${COLORS.bg};
        display: grid;
        place-items: center;
        padding: 28px;
        position: relative;
        overflow-x: hidden;
      }
      .orb {
        position: fixed;
        border-radius: 50%;
        filter: blur(90px);
        opacity: .5;
        pointer-events: none;
        z-index: 0;
      }
      .orb-1 { width: 480px; height: 480px; top: -160px; left: -120px; background: radial-gradient(circle, rgba(229,196,118,.30), transparent 70%); }
      .orb-2 { width: 520px; height: 520px; bottom: -200px; right: -140px; background: radial-gradient(circle, rgba(201,146,47,.22), transparent 70%); }
      .grain {
        position: fixed;
        inset: 0;
        pointer-events: none;
        opacity: .035;
        z-index: 0;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      }
      .card {
        position: relative;
        z-index: 1;
        width: min(760px, 100%);
        background: linear-gradient(165deg, ${COLORS.panel} 0%, ${COLORS.panelSoft} 100%);
        border: 1px solid ${COLORS.border};
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 30px 90px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.03);
        animation: rise .5s cubic-bezier(.16,1,.3,1);
      }
      @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      .hero {
        padding: 34px 36px 28px;
        border-bottom: 1px solid ${COLORS.border};
        background: linear-gradient(165deg, rgba(229,196,118,.08), transparent 65%);
      }
      .topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 22px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .mark {
        width: 30px;
        height: 30px;
        border-radius: 9px;
        background: linear-gradient(150deg, ${COLORS.goldSoft}, ${COLORS.goldDeep});
        display: grid;
        place-items: center;
        font-size: 12px;
        font-weight: 800;
        color: #1A1712;
        letter-spacing: -.02em;
        box-shadow: 0 4px 14px rgba(229,196,118,.30);
      }
      .brand-name {
        font-size: 12.5px;
        letter-spacing: .1em;
        color: ${COLORS.muted};
        font-weight: 700;
        text-transform: uppercase;
      }
      .badge {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 6px 12px 6px 10px;
        border-radius: 999px;
        background: ${TONE_BG[tone] || TONE_BG.ok};
        border: 1px solid ${toneColor}33;
        font-size: 12.5px;
        font-weight: 700;
        color: ${toneColor};
      }
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: ${toneColor};
        box-shadow: 0 0 0 0 ${toneColor}66;
        animation: pulse 2s infinite;
      }
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 ${toneColor}55; }
        70% { box-shadow: 0 0 0 7px ${toneColor}00; }
        100% { box-shadow: 0 0 0 0 ${toneColor}00; }
      }
      h1 { font-size: 27px; font-weight: 800; letter-spacing: -.01em; margin-bottom: 9px; }
      .sub { color: ${COLORS.muted}; font-size: 14.5px; line-height: 1.85; max-width: 56ch; }
      .grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        padding: 26px 36px;
      }
      .item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: rgba(255,255,255,.025);
        border: 1px solid ${COLORS.border};
        border-radius: 15px;
        padding: 15px 16px;
        transition: border-color .15s ease, background .15s ease;
      }
      .item:hover { border-color: ${COLORS.borderStrong}; background: rgba(255,255,255,.04); }
      .item-icon {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border-radius: 9px;
        background: rgba(255,255,255,.04);
        flex-shrink: 0;
      }
      .k { color: ${COLORS.muted}; font-size: 11px; text-transform: uppercase; letter-spacing: .07em; font-weight: 600; }
      .v { margin-top: 4px; font-size: 14.5px; font-weight: 700; word-break: break-word; }
      .footer {
        padding: 8px 36px 30px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: ${COLORS.goldSoft};
        text-decoration: none;
        font-size: 13.5px;
        font-weight: 600;
        border: 1px solid ${COLORS.border};
        padding: 9px 15px;
        border-radius: 11px;
        transition: border-color .15s ease, background .15s ease, transform .15s ease;
        background: rgba(255,255,255,.02);
      }
      .link:hover { border-color: ${COLORS.borderStrong}; background: rgba(229,196,118,.07); transform: translateY(-1px); }
      .foot-note {
        padding: 0 36px 26px;
        color: ${COLORS.muted};
        font-size: 11.5px;
        letter-spacing: .02em;
      }
      code {
        background: rgba(0,0,0,.3);
        padding: 2px 7px;
        border-radius: 6px;
        color: ${COLORS.gold};
        font-size: 13px;
        direction: ltr;
        display: inline-block;
      }
    </style>
  </head>
  <body>
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="grain"></div>
    <main class="card">
      <section class="hero">
        <div class="topline">
          <div class="brand">
            <span class="mark">ET</span>
            <span class="brand-name">ET-Cafe Platform</span>
          </div>
          <span class="badge"><span class="dot"></span>${escapeHtml(toneLabel)}</span>
        </div>
        <h1>${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="sub">${escapeHtml(subtitle)}</p>` : ''}
      </section>
      ${items.length ? `<section class="grid">${itemsHtml}</section>` : ''}
      ${links.length ? `<div class="footer">${linksHtml}</div>` : ''}
      <p class="foot-note">ET-Cafe · ${new Date().getFullYear()}</p>
    </main>
  </body>
</html>`;
}

// Content negotiation: real browsers send an explicit `text/html` Accept
// header with the highest priority, so they get the styled page; API/curl/
// monitoring clients typically send `Accept: */*` or `application/json` — by
// registering `json` first in res.format(), Express resolves an ambiguous
// `*/*` to JSON, keeping programmatic/monitoring consumers unaffected.
function sendStatus(req, res, { code = 200, json, html }) {
  res.status(code);
  res.format({
    json: () => res.json(json),
    html: () => res.send(html()),
    default: () => res.json(json),
  });
}

module.exports = { renderStatusPage, sendStatus, COLORS };
