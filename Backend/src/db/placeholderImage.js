// Demo/seed venues need *some* cover image, but hardcoding real photo-hosting
// URLs (Unsplash, picsum, ...) means every seed script silently depends on
// that third party being reachable forever — and unreachable from some
// networks entirely (which is exactly what broke production: real visitors
// were getting broken-image icons because images.unsplash.com couldn't be
// reached from this deployment's network). placehold.co is a plain color+text
// generator (no photo library, so no such outage risk) and themed to the
// app's own gold/charcoal palette so it still looks intentional, not broken.
const PALETTE = ['1f1b16', '2a2118', '171512', '262019', '1a1613'];

function placeholderCoverUrl(seed) {
  let hash = 0;
  for (const ch of String(seed)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const bg = PALETTE[hash % PALETTE.length];
  return `https://placehold.co/600x400/${bg}/e5c476`;
}

module.exports = { placeholderCoverUrl };
