const service = require('./service');

async function getCart(req, res, next) {
  try {
    const cart = await service.getSavedCart(req.user.id, req.params.venueId);
    res.json(cart ? cart.items : null);
  } catch (err) {
    next(err);
  }
}

async function upsertCart(req, res, next) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ message: 'items باید آرایه باشد.' });
    const cart = await service.upsertSavedCart(req.user.id, req.params.venueId, items);
    res.json(cart.items);
  } catch (err) {
    next(err);
  }
}

async function clearCart(req, res, next) {
  try {
    await service.clearSavedCart(req.user.id, req.params.venueId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { getCart, upsertCart, clearCart };
