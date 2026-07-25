const service = require('./service');

async function getBalance(req, res, next) {
  try {
    res.json(await service.getBalance(req.user.id, req.query.venueId));
  } catch (err) {
    next(err);
  }
}

async function listTransactions(req, res, next) {
  try {
    res.json(await service.listTransactions(req.user.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { getBalance, listTransactions };
