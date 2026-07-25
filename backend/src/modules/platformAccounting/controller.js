'use strict';
const svc = require('./service');
const { sendXlsx } = require('../../lib/xlsxExport');

async function commissionSummary(req, res, next) {
  try {
    const { from, to, groupBy } = req.query;
    res.json(await svc.getCommissionSummary({ from, to, groupBy }));
  } catch (e) { next(e); }
}

async function venueContribution(req, res, next) {
  try {
    const { venueId } = req.params;
    const { from, to } = req.query;
    const data = await svc.getVenueContribution(venueId, from, to);
    if (!data) return res.status(404).json({ message: 'مجموعه یافت نشد.' });
    res.json(data);
  } catch (e) { next(e); }
}

async function listCosts(req, res, next) {
  try {
    const { year, month } = req.query;
    const y = year || new Date().getFullYear();
    const m = month || new Date().getMonth() + 1;
    res.json(await svc.listPlatformCosts(y, m));
  } catch (e) { next(e); }
}

async function addCost(req, res, next) {
  try {
    const result = await svc.addPlatformCost({ ...req.body, createdBy: req.user.id });
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function updateCost(req, res, next) {
  try {
    await svc.updatePlatformCost(req.params.costId, req.body);
    res.json({ message: 'بروزرسانی شد.' });
  } catch (e) { next(e); }
}

async function deleteCost(req, res, next) {
  try {
    await svc.deletePlatformCost(req.params.costId);
    res.json({ message: 'حذف شد.' });
  } catch (e) { next(e); }
}

async function getPnL(req, res, next) {
  try {
    const year  = req.query.year  || new Date().getFullYear();
    const month = req.query.month || new Date().getMonth() + 1;
    res.json(await svc.getPnL(year, month));
  } catch (e) { next(e); }
}

async function getYearlyPnL(req, res, next) {
  try {
    res.json(await svc.getYearlyPnL(req.query.year || new Date().getFullYear()));
  } catch (e) { next(e); }
}

async function exportPnL(req, res, next) {
  try {
    const { year, month, format } = req.query;
    const data = month
      ? await svc.getPnL(year || new Date().getFullYear(), month)
      : await svc.getYearlyPnL(year || new Date().getFullYear());

    const rows = month
      ? [{ ...data }]
      : data.months;

    const headers = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== 'object');
    const cleanRows = rows.map((r) => Object.fromEntries(headers.map((h) => [h, r[h] ?? ''])));

    if (format === 'xlsx') {
      return sendXlsx(res, cleanRows, `pnl_${year}_${month || 'full'}.xlsx`, 'PnL');
    }

    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pnl_${year}_${month || 'full'}.csv"`);
    res.send('﻿' + csv);
  } catch (e) { next(e); }
}

module.exports = { commissionSummary, venueContribution, listCosts, addCost, updateCost, deleteCost, getPnL, getYearlyPnL, exportPnL };
