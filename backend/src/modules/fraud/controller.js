'use strict';
const svc = require('./service');
const rules = require('./rules');
const { setSetting } = require('../../lib/platformSettings');

async function summary(req, res, next) {
  try { res.json(await svc.getSummary()); } catch (e) { next(e); }
}

async function listFlags(req, res, next) {
  try {
    const { status, entityType, page, limit } = req.query;
    res.json(await svc.listFlags({ status, entityType, page: Number(page) || 1, limit: Number(limit) || 20 }));
  } catch (e) { next(e); }
}

async function getFlag(req, res, next) {
  try {
    const flag = await svc.getFlag(req.params.flagId);
    if (!flag) return res.status(404).json({ message: 'پرچم یافت نشد.' });
    res.json(flag);
  } catch (e) { next(e); }
}

async function reviewFlag(req, res, next) {
  try {
    await svc.reviewFlag(req.params.flagId, req.user.id, req.body);
    res.json({ message: 'بروزرسانی شد.' });
  } catch (e) { next(e); }
}

async function runScan(req, res, next) {
  try {
    const result = await svc.runDetection();
    res.json(result);
  } catch (e) { next(e); }
}

async function getThresholds(req, res, next) {
  try {
    res.json(await rules.getThresholds());
  } catch (e) { next(e); }
}

async function updateThresholds(req, res, next) {
  try {
    const current = await rules.getThresholds();
    const next_ = { ...current };
    for (const key of Object.keys(rules.DEFAULT_THRESHOLDS)) {
      if (req.body[key] !== undefined) next_[key] = Number(req.body[key]);
    }
    await setSetting('fraud.thresholds', next_);
    res.json(next_);
  } catch (e) { next(e); }
}

module.exports = { summary, listFlags, getFlag, reviewFlag, runScan, getThresholds, updateThresholds };
