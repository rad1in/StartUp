const service = require('./service');
const { logActivity } = require('../../lib/activityLog');

async function list(req, res, next) {
  try {
    res.json({ webhooks: await service.listWebhooks(req.params.venueId), availableEvents: service.ALLOWED_EVENTS });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const webhook = await service.createWebhook(req.params.venueId, req.body);
    await logActivity(req.params.venueId, req.user.id, 'WEBHOOK_CREATED', 'Webhook', webhook.id, { url: webhook.url });
    res.status(201).json(webhook);
  } catch (err) {
    next(err);
  }
}

async function toggle(req, res, next) {
  try {
    const webhook = await service.toggleWebhook(req.params.venueId, req.params.webhookId, req.body.isActive);
    res.json(webhook);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteWebhook(req.params.venueId, req.params.webhookId);
    await logActivity(req.params.venueId, req.user.id, 'WEBHOOK_DELETED', 'Webhook', req.params.webhookId, null);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function test(req, res, next) {
  try {
    const result = await service.testWebhook(req.params.venueId, req.params.webhookId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, toggle, remove, test };
