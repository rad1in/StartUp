const service = require('./service');

async function checkout(req, res, next) {
  try {
    const { orderId, shareId, walletAmount, provider } = req.body;
    if (!orderId) return res.status(400).json({ message: 'شناسه سفارش الزامی است.' });
    res.status(201).json(await service.checkout(orderId, shareId || null, walletAmount || 0, provider));
  } catch (err) {
    next(err);
  }
}

async function listMethods(req, res, next) {
  try {
    res.json(await service.listEnabledPaymentMethods());
  } catch (err) {
    next(err);
  }
}

async function verify(req, res, next) {
  try {
    const { providerRef } = req.params;
    res.json(await service.verify(providerRef));
  } catch (err) {
    next(err);
  }
}

async function samanCallback(req, res, next) {
  try {
    const { config } = require('../../config/config');
    const { orderId, status } = await service.handleSamanCallback(req.body);
    res.redirect(`${config.siteUrl}/account/orders/${orderId}?payment=${status === 'SUCCESS' ? 'success' : 'failed'}`);
  } catch (err) {
    next(err);
  }
}

async function paypingCallback(req, res, next) {
  try {
    const { config } = require('../../config/config');
    const { orderId, status } = await service.handlePaypingCallback(req.body);
    res.redirect(`${config.siteUrl}/account/orders/${orderId}?payment=${status === 'SUCCESS' ? 'success' : 'failed'}`);
  } catch (err) {
    next(err);
  }
}

module.exports = { checkout, verify, samanCallback, paypingCallback, listMethods };
