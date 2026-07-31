const service = require('./service');
const { renderSessionInvitePng } = require('../../lib/qrcode');

function participantInputFromRequest(req) {
  if (req.user?.role === 'CUSTOMER') return { userId: req.user.id };
  const guestName = (req.body.guestName || '').trim();
  if (!guestName) {
    const err = new Error('برای پیوستن به سفارش گروهی، نام مهمان الزامی است.');
    err.status = 400;
    throw err;
  }
  return { guestName };
}

async function create(req, res, next) {
  try {
    const { venueId, tableId } = req.body;
    if (!venueId || !tableId) {
      return res.status(400).json({ message: 'شناسه مجموعه و میز الزامی است.' });
    }
    const session = await service.createSession(venueId, tableId, participantInputFromRequest(req));
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
}

async function join(req, res, next) {
  try {
    const session = await service.joinSession(req.params.id, participantInputFromRequest(req));
    res.json(session);
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    res.json(await service.listSession(req.params.id, req.query.participantId || null));
  } catch (err) {
    next(err);
  }
}

async function addItem(req, res, next) {
  try {
    const { participantId, menuItemId, comboId, quantity, variantSelections } = req.body;
    if (!participantId) return res.status(400).json({ message: 'شناسه شرکت‌کننده الزامی است.' });
    res.status(201).json(await service.addItem(req.params.id, participantId, { menuItemId, comboId, quantity, variantSelections }));
  } catch (err) {
    next(err);
  }
}

async function removeItem(req, res, next) {
  try {
    res.json(await service.removeItem(req.params.id, req.params.itemId));
  } catch (err) {
    next(err);
  }
}

async function checkout(req, res, next) {
  try {
    const checkoutUserId = req.user?.role === 'CUSTOMER' ? req.user.id : null;
    res.status(201).json(await service.checkoutSession(req.params.id, checkoutUserId));
  } catch (err) {
    next(err);
  }
}

async function inviteQrCode(req, res, next) {
  try {
    const session = await service.listSession(req.params.id);
    const buffer = await renderSessionInvitePng(session.venueId, session.tableId, session.id);
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, join, get, addItem, removeItem, checkout, inviteQrCode };
