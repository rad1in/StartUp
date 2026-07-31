const { getSetting } = require('../lib/platformSettings');
const selfCaptcha = require('../lib/selfCaptcha');

async function sendChallenge(res, tier, attempts) {
  const challenge =
    tier === 'math'
      ? selfCaptcha.generateMathChallenge(attempts)
      : await selfCaptcha.generatePuzzleChallenge(attempts);
  res.status(428).json({
    message: 'لطفاً برای ادامه، چالش امنیتی را حل کنید.',
    captchaChallenge: challenge,
  });
}

// Self-hosted, three-tier CAPTCHA (see lib/selfCaptcha.js for the why). Same
// admin-toggleable on/off pattern the payment/SMS providers use — disabled by
// default so a fresh deployment never locks anyone out of auth.
//
// Flow: the client always sends `captchaSignals` (timing + honeypot) on the
// very first attempt. If those look human, it passes invisibly. Otherwise —
// or if a previous `captchaProof` was wrong — this responds 428 with a new
// (harder) challenge for the client to solve and resubmit the same request
// with, rather than rejecting outright.
async function requireCaptcha(req, res, next) {
  try {
    const enabled = await getSetting('captcha.enabled', false);
    if (!enabled) return next();

    const { captchaProof, captchaSignals } = req.body || {};

    if (captchaProof?.token) {
      const payload = selfCaptcha.verify(captchaProof.token);
      if (!payload) {
        // Expired or tampered-with token — start over at the puzzle tier.
        return sendChallenge(res, 'puzzle', 0);
      }

      if (payload.tier === 'puzzle') {
        if (selfCaptcha.checkPuzzleAnswer(payload, captchaProof)) return next();
        const attempts = (payload.attempts || 0) + 1;
        if (attempts >= selfCaptcha.MAX_PUZZLE_ATTEMPTS) return sendChallenge(res, 'math', 0);
        return sendChallenge(res, 'puzzle', attempts);
      }

      if (payload.tier === 'math') {
        if (selfCaptcha.checkMathAnswer(payload, captchaProof)) return next();
        return sendChallenge(res, 'math', (payload.attempts || 0) + 1);
      }
    }

    if (selfCaptcha.passesInvisibleCheck(captchaSignals)) return next();

    return sendChallenge(res, 'puzzle', 0);
  } catch (err) {
    next(err);
  }
}

module.exports = { requireCaptcha };
