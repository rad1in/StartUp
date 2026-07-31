// Self-hosted, dependency-free CAPTCHA — no external service, no API key,
// nothing that breaks if international connectivity drops. Three escalating
// tiers, cheapest/least-annoying first:
//
//   1. invisible — just timing + a honeypot field, checked on the very first
//      submit. Most real users never see anything.
//   2. puzzle    — a procedurally-generated image (gradient + noise, drawn
//      with sharp/SVG, never a stock photo) with an irregular notch cut out.
//      The user drags the matching piece back into place and rotates it.
//   3. math      — a trivial arithmetic question. Last resort so a confused
//      real user is never permanently stuck; actual abuse is capped by the
//      existing rate limiter/IP blocklist, not by this tier.
//
// Everything is stateless: each challenge is a signed (HMAC) token carrying
// its own answer + attempt count, so there is no server-side challenge store
// to clean up or leak.
const crypto = require('crypto');
const sharp = require('sharp');
const { config } = require('../config/config');

const CANVAS = { width: 300, height: 170 };
const PIECE_PADDING = 6; // extra margin around the blob when cutting its bounding box
const NOTCH_RADIUS = 22; // base radius of the irregular blob, before jitter
const POSITION_TOLERANCE_PX = 12;
const ANGLE_TOLERANCE_DEG = 14;
const MIN_HUMAN_MS = 900; // real users take at least this long to notice+solve a form
const CHALLENGE_TTL_MS = 3 * 60 * 1000;
const MAX_PUZZLE_ATTEMPTS = 3; // after this many wrong puzzle solves, escalate to math

const PALETTES = [
  ['#2a2118', '#171310'],
  ['#1f1b16', '#0d0b09'],
  ['#262019', '#120f0c'],
  ['#1a1613', '#0a0908'],
];

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

// --- Stateless signed tokens -------------------------------------------------

function sign(payload) {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const mac = b64url(crypto.createHmac('sha256', config.captchaSecret).update(body).digest());
  return `${body}.${mac}`;
}

function verify(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const expectedMac = b64url(crypto.createHmac('sha256', config.captchaSecret).update(body).digest());
  const macBuf = Buffer.from(mac);
  const expectedBuf = Buffer.from(expectedMac);
  if (macBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(macBuf, expectedBuf)) return null;
  try {
    const payload = JSON.parse(fromB64url(body).toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// --- Tier 0: invisible (timing + honeypot) ----------------------------------

function passesInvisibleCheck(signals) {
  if (!signals) return false;
  // A real form has an empty honeypot; any autofill-everything bot fills it.
  if (signals.honeypot) return false;
  const elapsed = Number(signals.elapsedMs);
  if (!Number.isFinite(elapsed) || elapsed < MIN_HUMAN_MS) return false;
  return true;
}

// --- Tier 1: puzzle ----------------------------------------------------------

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// An irregular (not-a-perfect-circle) blob path, so simple template-matching
// against a known circular cutout doesn't work.
function blobPath(cx, cy) {
  const points = 7;
  const coords = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const r = NOTCH_RADIUS + randomBetween(-6, 6);
    coords.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  let d = `M ${coords[0][0]} ${coords[0][1]} `;
  for (let i = 1; i <= points; i++) {
    const [x, y] = coords[i % points];
    d += `L ${x} ${y} `;
  }
  d += 'Z';
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);
  return {
    d,
    bbox: {
      left: Math.floor(Math.min(...xs)) - PIECE_PADDING,
      top: Math.floor(Math.min(...ys)) - PIECE_PADDING,
      right: Math.ceil(Math.max(...xs)) + PIECE_PADDING,
      bottom: Math.ceil(Math.max(...ys)) + PIECE_PADDING,
    },
  };
}

async function generatePuzzleChallenge(attempts = 0) {
  const [c1, c2] = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  const angle = Math.floor(randomBetween(0, 359));

  // Keep the notch well clear of the edges so the piece's bounding box (with
  // padding) never clips the canvas.
  const cx = Math.round(randomBetween(NOTCH_RADIUS + 20, CANVAS.width - NOTCH_RADIUS - 20));
  const cy = Math.round(randomBetween(NOTCH_RADIUS + 20, CANVAS.height - NOTCH_RADIUS - 20));
  const { d: pathD, bbox } = blobPath(cx, cy);
  const pieceWidth = bbox.right - bbox.left;
  const pieceHeight = bbox.bottom - bbox.top;

  // Deliberately busy/textured — a flat gradient makes the cut-out piece
  // nearly indistinguishable from the hole (bad for a human trying to match
  // them by eye); lots of small varied-opacity shapes gives every piece its
  // own little fragment of pattern to visually line up.
  const gridLines = Array.from({ length: 4 })
    .map((_, i) => {
      const y = (CANVAS.height / 5) * (i + 1);
      return `<line x1="0" y1="${y}" x2="${CANVAS.width}" y2="${y + randomBetween(-8, 8)}" stroke="#e5c476" stroke-width="1" opacity="0.08" />`;
    })
    .join('');
  const bokeh = Array.from({ length: 16 })
    .map(() => {
      const r = randomBetween(6, 34);
      const x = randomBetween(0, CANVAS.width);
      const y = randomBetween(0, CANVAS.height);
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="#e5c476" opacity="${randomBetween(0.05, 0.22).toFixed(3)}" />`;
    })
    .join('');
  const flecks = Array.from({ length: 40 })
    .map(() => {
      const x = randomBetween(0, CANVAS.width);
      const y = randomBetween(0, CANVAS.height);
      return `<circle cx="${x}" cy="${y}" r="1.4" fill="#f7f4ec" opacity="${randomBetween(0.08, 0.25).toFixed(3)}" />`;
    })
    .join('');

  const backgroundSvg = `
    <svg width="${CANVAS.width}" height="${CANVAS.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}" />
          <stop offset="100%" stop-color="${c2}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      ${gridLines}
      ${bokeh}
      ${flecks}
    </svg>`;

  const backgroundBuffer = await sharp(Buffer.from(backgroundSvg)).png().toBuffer();

  const blobMaskSvg = `<svg width="${CANVAS.width}" height="${CANVAS.height}" xmlns="http://www.w3.org/2000/svg"><path d="${pathD}" fill="#fff" /></svg>`;
  const blobMaskBuffer = await sharp(Buffer.from(blobMaskSvg)).png().toBuffer();

  // The piece itself: the background pixels, kept only where the blob mask
  // is opaque, cropped down to the blob's bounding box.
  const pieceFull = await sharp(backgroundBuffer)
    .composite([{ input: blobMaskBuffer, blend: 'dest-in' }])
    .png()
    .toBuffer();
  const piece = await sharp(pieceFull)
    .extract({ left: bbox.left, top: bbox.top, width: pieceWidth, height: pieceHeight })
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // The "hole" — same blob shape punched into the background at full
  // opacity, in the page's own charcoal, so it reads as a missing piece.
  const holeFillSvg = `<svg width="${CANVAS.width}" height="${CANVAS.height}" xmlns="http://www.w3.org/2000/svg"><path d="${pathD}" fill="#0d0c0a" /></svg>`;
  const holeFillBuffer = await sharp(Buffer.from(holeFillSvg)).png().toBuffer();
  const background = await sharp(backgroundBuffer)
    .composite([{ input: holeFillBuffer, blend: 'over' }])
    .png()
    .toBuffer();

  // Correction the user must dial in to visually straighten the piece back out.
  const requiredRotation = (360 - angle) % 360;

  const token = sign({
    tier: 'puzzle',
    x: bbox.left,
    y: bbox.top,
    angle: requiredRotation,
    attempts,
    iat: Date.now(),
    exp: Date.now() + CHALLENGE_TTL_MS,
  });

  return {
    tier: 'puzzle',
    token,
    background: `data:image/png;base64,${background.toString('base64')}`,
    piece: `data:image/png;base64,${piece.toString('base64')}`,
    canvas: CANVAS,
    pieceBox: { width: pieceWidth, height: pieceHeight },
  };
}

function angleDiff(a, b) {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

function checkPuzzleAnswer(payload, proof) {
  const x = Number(proof?.x);
  const y = Number(proof?.y);
  const rotation = Number(proof?.rotation);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(rotation)) return false;
  return (
    Math.abs(x - payload.x) <= POSITION_TOLERANCE_PX &&
    Math.abs(y - payload.y) <= POSITION_TOLERANCE_PX &&
    angleDiff(rotation, payload.angle) <= ANGLE_TOLERANCE_DEG
  );
}

// --- Tier 2: math (last-resort fallback) ------------------------------------

function generateMathChallenge(attempts = 0) {
  const a = Math.floor(randomBetween(2, 20));
  const b = Math.floor(randomBetween(2, 20));
  const useSubtraction = Math.random() < 0.5 && a > b;
  const answer = useSubtraction ? a - b : a + b;
  const token = sign({
    tier: 'math',
    answer,
    attempts,
    iat: Date.now(),
    exp: Date.now() + CHALLENGE_TTL_MS,
  });
  return {
    tier: 'math',
    token,
    a,
    b,
    operator: useSubtraction ? '-' : '+',
  };
}

function checkMathAnswer(payload, proof) {
  return Number(proof?.answer) === payload.answer;
}

module.exports = {
  passesInvisibleCheck,
  generatePuzzleChallenge,
  checkPuzzleAnswer,
  generateMathChallenge,
  checkMathAnswer,
  verify,
  MAX_PUZZLE_ATTEMPTS,
};
