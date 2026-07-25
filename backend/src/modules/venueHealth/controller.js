const service = require('./service');

async function list(req, res, next) {
  try {
    const scores = await service.computeHealthScores();
    scores.sort((a, b) => a.score - b.score);
    res.json(scores);
  } catch (err) {
    next(err);
  }
}

async function forVenue(req, res, next) {
  try {
    res.json(await service.getHealthForVenue(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, forVenue };
