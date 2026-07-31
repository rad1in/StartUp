const service = require('./service');
const { findById } = require('../../lib/sqlHelpers');
const { renderAccountingSummaryPdf } = require('../../lib/pdf');
const { renderAccountingSummaryCsv } = require('../../lib/csv');
const XLSX = require('xlsx');

async function summary(req, res, next) {
  try {
    const summaryData = await service.salesSummary(req.params.venueId, req.query.period);

    if (req.query.format === 'csv' || req.query.format === 'pdf' || req.query.format === 'xlsx') {
      const [byCategory, byItem, venue] = await Promise.all([
        service.revenueByCategory(req.params.venueId),
        service.revenueByItem(req.params.venueId),
        findById('Venue', req.params.venueId),
      ]);

      if (req.query.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="sales-summary.csv"');
        return res.send(renderAccountingSummaryCsv({ summary: summaryData, byCategory, byItem }));
      }

      if (req.query.format === 'xlsx') {
        // One sheet per section — matches the CSV export's three blocks
        // (summary/byCategory/byItem) without cramming mismatched columns
        // into a single flat table.
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet([summaryData]), 'خلاصه');
        XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(byCategory), 'دسته‌بندی');
        XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(byItem), 'آیتم‌ها');
        const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="sales-summary.xlsx"');
        return res.send(buffer);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="sales-summary.pdf"');
      return renderAccountingSummaryPdf({ venue, summary: summaryData, byCategory }, res);
    }

    res.json(summaryData);
  } catch (err) {
    next(err);
  }
}

async function byCategory(req, res, next) {
  try {
    res.json(await service.revenueByCategory(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function byItem(req, res, next) {
  try {
    res.json(await service.revenueByItem(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function listExpenses(req, res, next) {
  try {
    res.json(await service.listExpenses(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function createExpense(req, res, next) {
  try {
    res.status(201).json(await service.createExpense(req.params.venueId, req.body));
  } catch (err) {
    next(err);
  }
}

async function deleteExpense(req, res, next) {
  try {
    await service.deleteExpense(req.params.expenseId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function dashboard(req, res, next) {
  try {
    res.json(await service.dashboard(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function listPayouts(req, res, next) {
  try {
    res.json(await service.listPayoutsForVenue(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, byCategory, byItem, listExpenses, createExpense, deleteExpense, dashboard, listPayouts };
