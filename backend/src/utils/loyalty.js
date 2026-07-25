const { config } = require('../config/config');

function pointsEarnedForOrder(venue, totalAmount) {
  const rate = venue?.loyaltyPointsRate != null ? Number(venue.loyaltyPointsRate) : config.loyalty.defaultPointsRate;
  return Math.floor((Number(totalAmount) / 10000) * rate);
}

function pointsToToman(points) {
  return Number(points) * config.loyalty.pointRedemptionValue;
}

module.exports = { pointsEarnedForOrder, pointsToToman, POINT_REDEMPTION_VALUE: config.loyalty.pointRedemptionValue };
