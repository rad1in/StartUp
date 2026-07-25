const service = require('./service');
const { logActivity } = require('../../lib/activityLog');

async function list(req, res, next) {
  try {
    res.json(await service.getStages(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function advance(req, res, next) {
  try {
    const { status, note } = req.body;
    const stages = await service.advanceStage(req.params.venueId, req.params.stageKey, { status, note }, req.user.id);
    await logActivity(req.params.venueId, req.user.id, 'VENUE_APPROVAL_STAGE_UPDATED', 'Venue', req.params.venueId, {
      stageKey: req.params.stageKey,
      status,
    });
    res.json(stages);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, advance };
