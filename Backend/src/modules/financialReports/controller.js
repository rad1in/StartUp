const service = require('./service');

async function getSchedule(req, res, next) {
  try {
    res.json(await service.getSchedule(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function updateSchedule(req, res, next) {
  try {
    res.json(await service.updateSchedule(req.params.venueId, req.body));
  } catch (err) {
    next(err);
  }
}

async function listReports(req, res, next) {
  try {
    res.json(await service.listReports(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function generateNow(req, res, next) {
  try {
    const sched = await service.getSchedule(req.params.venueId);
    const now = new Date();
    const intervalMs = sched.frequency === 'MONTHLY' ? 30 * 24 * 3600 * 1000 : 7 * 24 * 3600 * 1000;
    const periodStart = sched.lastGeneratedAt ? new Date(sched.lastGeneratedAt) : new Date(now.getTime() - intervalMs);
    const report = await service.generateReport(req.params.venueId, periodStart, now, sched.frequency);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSchedule, updateSchedule, listReports, generateNow };
