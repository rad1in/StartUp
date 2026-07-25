const service = require('./service');

async function getBalance(req, res, next) {
  try {
    const data = await service.getBalance(req.user.id);
    res.json(data);
  } catch (err) { next(err); }
}

async function getTransactions(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const data = await service.listTransactions(req.user.id, { limit, offset });
    res.json(data);
  } catch (err) { next(err); }
}

async function topUp(req, res, next) {
  try {
    const amount = Number(req.body.amount);
    const result = await service.initiateTopUp(req.user.id, amount, req.body.provider);
    res.json(result);
  } catch (err) { next(err); }
}

async function verifyTopUp(req, res, next) {
  try {
    const result = await service.confirmTopUp(req.params.providerRef);
    res.json(result);
  } catch (err) { next(err); }
}

module.exports = { getBalance, getTransactions, topUp, verifyTopUp };
