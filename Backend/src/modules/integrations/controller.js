const service = require('./service');

async function getStatus(req, res, next) {
  try {
    res.json(await service.getStatus());
  } catch (err) {
    next(err);
  }
}

async function updatePayment(req, res, next) {
  try {
    res.json(await service.updatePaymentSettings(req.body, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function updateSms(req, res, next) {
  try {
    res.json(await service.updateSmsSettings(req.body, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function updateEmail(req, res, next) {
  try {
    res.json(await service.updateEmailSettings(req.body, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function updateCaptcha(req, res, next) {
  try {
    res.json(await service.updateCaptchaSettings(req.body, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function updateAnalytics(req, res, next) {
  try {
    res.json(await service.updateAnalyticsSettings(req.body, req.user.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { getStatus, updatePayment, updateSms, updateEmail, updateCaptcha, updateAnalytics };
