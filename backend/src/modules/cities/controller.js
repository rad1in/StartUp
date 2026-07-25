const service = require('./service');

async function list(req, res, next) {
  try {
    const data = await service.getAll();
    // Reference data — let browsers cache it for a day.
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
