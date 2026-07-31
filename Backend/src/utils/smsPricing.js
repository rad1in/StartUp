// Melipayamak's own per-message price works out to ~297 Toman
// (234,376 Rial for a 79-message bundle = 2,966.8 Rial = 296.7 Toman/msg).
// Venue-facing pricing is a staircase off that: FREE tier pays a bit above
// it (platform margin), PRO pays half of the FREE price, ULTRA is free
// (platform absorbs the raw cost as a subscription perk).
const SMS_PRICE_BY_TIER = {
  FREE: 350,
  PRO: 175,
  ULTRA: 0,
};

function pricePerMessageForTier(tier) {
  return SMS_PRICE_BY_TIER[tier] ?? SMS_PRICE_BY_TIER.FREE;
}

module.exports = { SMS_PRICE_BY_TIER, pricePerMessageForTier };
