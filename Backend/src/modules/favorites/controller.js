const service = require('./service');

async function listVenues(req, res, next) {
  try {
    res.json(await service.listFavoriteVenues(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function addVenue(req, res, next) {
  try {
    await service.addFavoriteVenue(req.user.id, req.params.venueId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function removeVenue(req, res, next) {
  try {
    await service.removeFavoriteVenue(req.user.id, req.params.venueId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listItems(req, res, next) {
  try {
    res.json(await service.listFavoriteItems(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function addItem(req, res, next) {
  try {
    const { savedCustomization, nickname } = req.body || {};
    await service.addFavoriteItem(req.user.id, req.params.menuItemId, { savedCustomization, nickname });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const { savedCustomization, nickname } = req.body || {};
    await service.updateFavoriteItem(req.user.id, req.params.menuItemId, { savedCustomization, nickname });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function removeItem(req, res, next) {
  try {
    await service.removeFavoriteItem(req.user.id, req.params.menuItemId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function recentlyViewed(req, res, next) {
  try {
    res.json(await service.listRecentlyViewed(req.user.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { listVenues, addVenue, removeVenue, listItems, addItem, updateItem, removeItem, recentlyViewed };
