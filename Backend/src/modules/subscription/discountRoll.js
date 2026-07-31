// Weighted bands for the random per-order subscription discount. Each
// weight doubles as a percentage chance since they sum to 100.
const BANDS = [
  { min: 5, max: 14, weight: 38 },
  { min: 15, max: 29, weight: 30 },
  { min: 30, max: 49, weight: 17 },
  { min: 50, max: 69, weight: 10 },
  { min: 70, max: 89, weight: 4 },
  { min: 90, max: 90, weight: 1 },
];

const HIGH_DISCOUNT_THRESHOLD = 50;
// At most this many >=50% discounts land within one active subscription period.
const HIGH_DISCOUNT_CAP = 3;

function pickBand(bands) {
  const totalWeight = bands.reduce((sum, b) => sum + b.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const band of bands) {
    if (roll < band.weight) return band;
    roll -= band.weight;
  }
  return bands[bands.length - 1];
}

// Once the subscription has already hit its high-discount cap for the
// period, the >=50% bands drop out and the rest re-normalize — the customer
// still always gets a discount, just never another big one until renewal.
function rollDiscountPercent(highDiscountCountSoFar) {
  const capReached = highDiscountCountSoFar >= HIGH_DISCOUNT_CAP;
  const bands = capReached ? BANDS.filter((b) => b.min < HIGH_DISCOUNT_THRESHOLD) : BANDS;
  const band = pickBand(bands);
  const span = band.max - band.min + 1;
  const percent = band.min + Math.floor(Math.random() * span);
  return { percent, isHigh: percent >= HIGH_DISCOUNT_THRESHOLD };
}

module.exports = { rollDiscountPercent, HIGH_DISCOUNT_THRESHOLD, HIGH_DISCOUNT_CAP };
