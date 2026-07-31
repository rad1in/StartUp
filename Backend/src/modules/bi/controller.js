'use strict';
const svc = require('./service');
const { sendXlsx } = require('../../lib/xlsxExport');

async function overview(req, res, next) {
  try {
    const { from, to } = req.query;
    res.json(await svc.getFinancialOverview(from, to));
  } catch (e) { next(e); }
}

async function trend(req, res, next) {
  try {
    const { from, to, granularity } = req.query;
    res.json(await svc.getRevenueTrend(from, to, granularity));
  } catch (e) { next(e); }
}

async function byTier(req, res, next) {
  try {
    res.json(await svc.getBreakdownByTier(req.query.from, req.query.to));
  } catch (e) { next(e); }
}

async function byVenue(req, res, next) {
  try {
    const { from, to, limit } = req.query;
    res.json(await svc.getBreakdownByVenue(from, to, limit));
  } catch (e) { next(e); }
}

async function byCity(req, res, next) {
  try {
    res.json(await svc.getBreakdownByCity(req.query.from, req.query.to));
  } catch (e) { next(e); }
}

async function cohorts(req, res, next) {
  try {
    res.json(await svc.getCustomerCohorts(req.query.from, req.query.to));
  } catch (e) { next(e); }
}

async function venueActivity(req, res, next) {
  try {
    res.json(await svc.getVenueActivity(req.query.from, req.query.to));
  } catch (e) { next(e); }
}

async function funnel(req, res, next) {
  try {
    res.json(await svc.getConversionFunnel(req.query.from, req.query.to, req.query.venueId));
  } catch (e) { next(e); }
}

async function drillDown(req, res, next) {
  try {
    const { dimension, id, from, to, limit } = req.query;
    res.json(await svc.getDrillDown(dimension, id, from, to, limit));
  } catch (e) { next(e); }
}

async function exportCSV(req, res, next) {
  try {
    const { type, from, to, granularity, format } = req.query;
    if (format === 'xlsx') {
      const rows = await svc.getExportRows(type, from, to, { granularity });
      return sendXlsx(res, rows, `bi_export_${type}_${Date.now()}.xlsx`, type.slice(0, 31));
    }
    const csv = await svc.exportData(type, from, to, { granularity });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bi_export_${type}_${Date.now()}.csv"`);
    res.send('﻿' + csv); // BOM for Excel compatibility
  } catch (e) { next(e); }
}

module.exports = { overview, trend, byTier, byVenue, byCity, cohorts, venueActivity, funnel, drillDown, exportCSV };
