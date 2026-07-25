const { getSetting } = require('../../lib/platformSettings');

async function getConfig(req, res, next) {
  try {
    const enabled = Boolean(await getSetting('captcha.enabled', false));
    const siteKey = enabled ? await getSetting('captcha.hcaptcha.siteKey', '') : '';
    res.json({ enabled: enabled && Boolean(siteKey), siteKey });
  } catch (err) {
    next(err);
  }
}

module.exports = { getConfig };
