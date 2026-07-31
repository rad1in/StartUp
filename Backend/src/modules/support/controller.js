const service = require('./service');

async function createTicket(req, res, next) {
  try {
    const { subject, department, message, isConfidential } = req.body;
    const ticket = await service.createTicket(
      req.user.id,
      { subject, department, message, isConfidential: isConfidential === 'true' || isConfidential === true },
      req.files
    );
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
}

async function listMyTickets(req, res, next) {
  try {
    res.json(await service.listMyTickets(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function listAllTickets(req, res, next) {
  try {
    const { department, status } = req.query;
    res.json(await service.listAllTickets({ department, status }));
  } catch (err) {
    next(err);
  }
}

async function getTicket(req, res, next) {
  try {
    res.json(await service.getTicket(req.user, req.params.id));
  } catch (err) {
    next(err);
  }
}

async function reply(req, res, next) {
  try {
    const { body, isConfidential } = req.body;
    const ticket = await service.replyToTicket(
      req.user,
      req.params.id,
      { body, isConfidential: isConfidential === 'true' || isConfidential === true },
      req.files
    );
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
}

async function setStatus(req, res, next) {
  try {
    res.json(await service.setStatus(req.user, req.params.id, req.body.status));
  } catch (err) {
    next(err);
  }
}

module.exports = { createTicket, listMyTickets, listAllTickets, getTicket, reply, setStatus };
