const { forecastVenue } = require('./service');

async function getForecast(req, res, next) {
  try {
    const { venueId } = req.params;
    const days = Math.min(Number(req.query.days) || 7, 30);
    res.json(await forecastVenue(venueId, days));
  } catch (err) { next(err); }
}

module.exports = { getForecast };
