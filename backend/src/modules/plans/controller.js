'use strict';
const svc = require('./service');

async function listPlans(req, res, next) {
  try { res.json(await svc.listPlans()); } catch (e) { next(e); }
}

async function updatePlan(req, res, next) {
  try {
    await svc.updatePlan(req.params.tier, req.body);
    res.json({ message: 'پلن بروزرسانی شد.' });
  } catch (e) { next(e); }
}

async function getTrialSettings(req, res, next) {
  try { res.json(await svc.getTrialSettings()); } catch (e) { next(e); }
}

async function updateTrialSettings(req, res, next) {
  try {
    await svc.updateTrialSettings(req.body);
    res.json({ message: 'تنظیمات آزمایشی بروزرسانی شد.' });
  } catch (e) { next(e); }
}

async function startTrial(req, res, next) {
  try {
    const { venueId } = req.params;
    const ownerId = req.user.id;
    const { tier, phone, businessId, bankAccount } = req.body;
    if (!['PRO', 'ULTRA'].includes(tier)) return res.status(400).json({ message: 'پلن نامعتبر است.' });
    const result = await svc.startTrial(venueId, ownerId, tier, { phone, businessId, bankAccount });
    res.status(201).json(result);
  } catch (e) {
    if (e.message.includes('تکراری') || e.message.includes('قبلاً')) {
      return res.status(409).json({ message: e.message });
    }
    next(e);
  }
}

async function getTrialStatus(req, res, next) {
  try {
    const status = await svc.getTrialStatus(req.params.venueId);
    if (!status) return res.status(404).json({ message: 'دوره آزمایشی یافت نشد.' });
    res.json(status);
  } catch (e) { next(e); }
}

module.exports = { listPlans, updatePlan, getTrialSettings, updateTrialSettings, startTrial, getTrialStatus };
