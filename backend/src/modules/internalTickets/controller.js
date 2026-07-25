'use strict';
const svc = require('./service');

async function summary(req, res, next) {
  try { res.json(await svc.getOverdueSummary()); } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const { status, priority, assignedTo, search, page, limit } = req.query;
    res.json(await svc.listTickets({ status, priority, assignedTo, search, page: Number(page) || 1, limit: Number(limit) || 20 }));
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const result = await svc.createTicket({ ...req.body, createdBy: req.user.id });
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const ticket = await svc.getTicket(req.params.ticketId);
    if (!ticket) return res.status(404).json({ message: 'تیکت یافت نشد.' });
    res.json(ticket);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    await svc.updateTicket(req.params.ticketId, req.body);
    res.json({ message: 'بروزرسانی شد.' });
  } catch (e) { next(e); }
}

async function addComment(req, res, next) {
  try {
    const result = await svc.addComment(req.params.ticketId, req.user.id, req.body.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function escalate(req, res, next) {
  try {
    const result = await svc.escalateFromSupport(req.body.supportTicketId, req.user.id);
    res.status(201).json(result);
  } catch (e) { next(e); }
}

module.exports = { summary, list, create, getOne, update, addComment, escalate };
