const service = require('./service');

async function getCredit(req, res, next) {
  try {
    res.json(await service.getCredit(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function listCreditTransactions(req, res, next) {
  try {
    res.json(await service.listCreditTransactions(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function topUpCredit(req, res, next) {
  try {
    const { amount, provider } = req.body;
    res.json(await service.initiateCreditTopUp(req.params.venueId, Number(amount), provider));
  } catch (err) {
    next(err);
  }
}

async function verifyCreditTopUp(req, res, next) {
  try {
    res.json(await service.confirmCreditTopUp(req.params.providerRef));
  } catch (err) {
    next(err);
  }
}

async function listCampaigns(req, res, next) {
  try {
    res.json(await service.listCampaigns(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function createCampaign(req, res, next) {
  try {
    res.status(201).json(await service.createCampaign(req.params.venueId, req.body));
  } catch (err) {
    next(err);
  }
}

async function listForAdmin(req, res, next) {
  try {
    res.json(await service.listForAdmin(req.query.status));
  } catch (err) {
    next(err);
  }
}

async function approveCampaign(req, res, next) {
  try {
    res.json(await service.approveCampaign(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function rejectCampaign(req, res, next) {
  try {
    res.json(await service.rejectCampaign(req.params.id, req.user.id, req.body.reason));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCredit,
  listCreditTransactions,
  topUpCredit,
  verifyCreditTopUp,
  listCampaigns,
  createCampaign,
  listForAdmin,
  approveCampaign,
  rejectCampaign,
};
