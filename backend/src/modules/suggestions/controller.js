const suggestionsService = require('./service');
const venuesService = require('../venues/service');

async function get(req, res, next) {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng) : null;
    const position = lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng) ? { lat, lng } : null;
    const customerId = req.user?.role === 'CUSTOMER' ? req.user.id : null;

    const venues = await venuesService.listVenues();
    const scored = await suggestionsService.scoreVenues(venues, { customerId, position });
    res.json(scored);
  } catch (err) {
    // Suggestions must never block discovery — fall back to the plain venue
    // list (unscored) rather than surfacing a 500 to the browsing customer.
    try {
      res.json(await venuesService.listVenues());
    } catch (fallbackErr) {
      next(fallbackErr);
    }
  }
}

module.exports = { get };
