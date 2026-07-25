const service = require('./service');

async function getMine(req, res, next) {
  try {
    res.json(await service.getMyReferralInfo(req.user.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { getMine };
