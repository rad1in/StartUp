const service = require('./service');

async function create(req, res, next) {
  try {
    res.status(201).json(await service.createReview(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    res.json(await service.updateReview(req.user.id, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteReview(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    res.json(await service.listMyReviews(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function listForVenue(req, res, next) {
  try {
    res.json(await service.listVenueReviews(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function reply(req, res, next) {
  try {
    res.json(await service.replyToReview(req.params.venueId, req.params.id, req.body.reply));
  } catch (err) {
    next(err);
  }
}

async function sentiment(req, res, next) {
  try {
    res.json(await service.sentimentTrend(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

module.exports = { create, update, remove, listMine, listForVenue, reply, sentiment };
