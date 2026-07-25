const service = require('./service');
const { toCsv } = require('../../lib/csv');
const { sendXlsx } = require('../../lib/xlsxExport');

function sendCsvIfRequested(req, res, rows) {
  if (rows.length === 0) return false;
  if (req.query.format === 'xlsx') {
    sendXlsx(res, rows, 'report.xlsx', 'Report');
    return true;
  }
  if (req.query.format !== 'csv') return false;
  const headers = Object.keys(rows[0]);
  const csvRows = [headers, ...rows.map((row) => headers.map((h) => row[h]))];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
  res.send(toCsv(csvRows));
  return true;
}

async function revenueByVenue(req, res, next) {
  try {
    const rows = await service.revenueByVenue();
    if (sendCsvIfRequested(req, res, rows)) return;
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function revenueByRegion(req, res, next) {
  try {
    const rows = await service.revenueByRegion();
    if (sendCsvIfRequested(req, res, rows)) return;
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function commissionByTier(req, res, next) {
  try {
    const rows = await service.commissionByTier();
    if (sendCsvIfRequested(req, res, rows)) return;
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function topVenues(req, res, next) {
  try {
    const rows = await service.topVenues();
    if (sendCsvIfRequested(req, res, rows)) return;
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function retention(req, res, next) {
  try {
    res.json(await service.retention());
  } catch (err) {
    next(err);
  }
}

async function fraudFlags(req, res, next) {
  try {
    res.json(await service.fraudFlags());
  } catch (err) {
    next(err);
  }
}

async function reconciliation(req, res, next) {
  try {
    const rows = await service.reconciliation();
    if (sendCsvIfRequested(req, res, rows)) return;
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function refundOverview(req, res, next) {
  try {
    res.json(await service.refundOverview());
  } catch (err) {
    next(err);
  }
}

module.exports = {
  revenueByVenue,
  revenueByRegion,
  commissionByTier,
  topVenues,
  retention,
  fraudFlags,
  reconciliation,
  refundOverview,
};
