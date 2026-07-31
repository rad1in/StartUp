const { getSetting } = require('../../lib/platformSettings');

async function getConfig(req, res, next) {
  try {
    const enabled = Boolean(await getSetting('analytics.ga4.enabled', false));
    const measurementId = enabled ? await getSetting('analytics.ga4.measurementId', '') : '';
    res.json({ enabled: enabled && Boolean(measurementId), measurementId });
  } catch (err) {
    next(err);
  }
}

module.exports = { getConfig };
