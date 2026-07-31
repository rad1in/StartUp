const service = require('./service');
const { config } = require('../../config/config');

async function publicKey(req, res) {
  res.json({ publicKey: config.vapid.publicKey || null });
}

async function subscribe(req, res, next) {
  try {
    res.status(201).json(await service.subscribe(req.user.id, req.body, req.headers['user-agent']));
  } catch (err) {
    next(err);
  }
}

async function unsubscribe(req, res, next) {
  try {
    res.json(await service.unsubscribe(req.user.id, req.body.endpoint));
  } catch (err) {
    next(err);
  }
}

async function registerExpoToken(req, res, next) {
  try {
    res.status(201).json(await service.registerExpoToken(req.user.id, req.body.token, req.body.deviceInfo));
  } catch (err) {
    next(err);
  }
}

async function unregisterExpoToken(req, res, next) {
  try {
    res.json(await service.unregisterExpoToken(req.user.id, req.body.token));
  } catch (err) {
    next(err);
  }
}

module.exports = { publicKey, subscribe, unsubscribe, registerExpoToken, unregisterExpoToken };
