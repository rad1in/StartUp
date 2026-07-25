const service = require('./service');
const { logActivity } = require('../../lib/activityLog');

async function setVenueStatus(req, res, next) {
  try {
    const { venueIds, isTemporarilyClosed, acceptsPickup } = req.body;
    const result = await service.bulkSetVenueStatus(venueIds, { isTemporarilyClosed, acceptsPickup });
    await logActivity(null, req.user.id, 'CONTENT_CENTER_BULK_VENUE_STATUS', 'Venue', venueIds.join(','), req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function findReplaceDescription(req, res, next) {
  try {
    const { venueIds, find, replace } = req.body;
    const result = await service.bulkFindReplaceDescription(venueIds, find, replace);
    await logActivity(null, req.user.id, 'CONTENT_CENTER_BULK_DESCRIPTION', 'Venue', venueIds.join(','), { find, replace });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function adjustMenuPrices(req, res, next) {
  try {
    const { venueIds, percent } = req.body;
    const result = await service.bulkAdjustMenuPrices(venueIds, percent);
    await logActivity(null, req.user.id, 'CONTENT_CENTER_BULK_PRICE_ADJUST', 'MenuItem', venueIds.join(','), { percent });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function setItemAvailability(req, res, next) {
  try {
    const { venueIds, itemNameContains, isAvailable } = req.body;
    const result = await service.bulkSetItemAvailability(venueIds, itemNameContains, isAvailable);
    await logActivity(null, req.user.id, 'CONTENT_CENTER_BULK_AVAILABILITY', 'MenuItem', venueIds.join(','), {
      itemNameContains,
      isAvailable,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { setVenueStatus, findReplaceDescription, adjustMenuPrices, setItemAvailability };
