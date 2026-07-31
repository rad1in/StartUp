const { getSetting } = require('../lib/platformSettings');
const { AqayePardakhtProvider, buildCallbackUrl } = require('./AqayePardakhtProvider');
const { SamanProvider, buildSamanCallbackUrl } = require('./SamanProvider');
const { ZarinpalProvider, buildZarinpalCallbackUrl } = require('./ZarinpalProvider');
const { ZibalProvider, buildZibalCallbackUrl } = require('./ZibalProvider');
const { PaypingProvider, buildPaypingCallbackUrl } = require('./PaypingProvider');

// Each real gateway is independently enabled/disabled (payment.<name>.enabled)
// rather than there being one global "active provider" — the customer picks
// which one to pay with at checkout (see GET /payments/methods). No mock/
// simulated provider exists here on purpose — production must never be able
// to silently fall back to a fake payment outcome. For local dev testing,
// enable a real gateway in sandbox mode via the admin Integrations page
// instead (ZarinPal and AqayePardakht both support a sandbox toggle).
const PROVIDER_LABELS = {
  aqayepardakht: 'آقای پرداخت',
  saman: 'سامان (SEP)',
  zarinpal: 'زرین‌پال',
  zibal: 'زیبال',
  payping: 'پی‌پینگ',
};

const AVAILABLE_PROVIDERS = Object.keys(PROVIDER_LABELS);

async function buildProvider(name) {
  switch (name) {
    case 'aqayepardakht': {
      const pin = await getSetting('payment.aqayepardakht.pin', '');
      const sandbox = await getSetting('payment.aqayepardakht.sandbox', true);
      return new AqayePardakhtProvider({ pin, sandbox, callbackUrl: buildCallbackUrl() });
    }
    case 'saman': {
      const terminalId = await getSetting('payment.saman.terminalId', '');
      return new SamanProvider({ terminalId, callbackUrl: buildSamanCallbackUrl() });
    }
    case 'zarinpal': {
      const merchantId = await getSetting('payment.zarinpal.merchantId', '');
      const sandbox = await getSetting('payment.zarinpal.sandbox', true);
      return new ZarinpalProvider({ merchantId, sandbox, callbackUrl: buildZarinpalCallbackUrl() });
    }
    case 'zibal': {
      const merchant = await getSetting('payment.zibal.merchant', '');
      return new ZibalProvider({ merchant, callbackUrl: buildZibalCallbackUrl() });
    }
    case 'payping': {
      const accessToken = await getSetting('payment.payping.accessToken', '');
      return new PaypingProvider({ accessToken, callbackUrl: buildPaypingCallbackUrl() });
    }
    default: {
      const err = new Error('روش پرداخت نامعتبر است.');
      err.status = 400;
      throw err;
    }
  }
}

async function isProviderEnabled(name) {
  if (!AVAILABLE_PROVIDERS.includes(name)) return false;
  return Boolean(await getSetting(`payment.${name}.enabled`, false));
}

// What the customer is allowed to pick at checkout.
async function listEnabledPaymentMethods() {
  const enabled = [];
  for (const name of AVAILABLE_PROVIDERS) {
    if (await isProviderEnabled(name)) enabled.push({ name, label: PROVIDER_LABELS[name] });
  }
  return enabled;
}

// Used when STARTING a new payment (checkout / wallet top-up) — throws if
// the customer's chosen provider isn't actually enabled (covers both
// "unknown name" and "admin turned it off since the page loaded"), and also
// if no provider name was given at all (there is no default to fall back to
// anymore).
async function getPaymentProviderByName(name) {
  if (!name || !AVAILABLE_PROVIDERS.includes(name) || !(await isProviderEnabled(name))) {
    const err = new Error('این روش پرداخت در حال حاضر فعال نیست.');
    err.status = 400;
    throw err;
  }
  return { provider: await buildProvider(name), providerName: name };
}

// Used when VERIFYING a payment already in flight — deliberately skips the
// enabled check, since an admin toggling a gateway off mid-transaction
// shouldn't strand a customer's already-created payment unverifiable. Still
// requires a real, known provider name, since there is nothing to fall back to.
async function getPaymentProviderForVerification(name) {
  if (!name || !AVAILABLE_PROVIDERS.includes(name)) {
    const err = new Error('روش پرداخت نامعتبر است.');
    err.status = 400;
    throw err;
  }
  return { provider: await buildProvider(name), providerName: name };
}

module.exports = {
  AVAILABLE_PROVIDERS,
  PROVIDER_LABELS,
  isProviderEnabled,
  listEnabledPaymentMethods,
  getPaymentProviderByName,
  getPaymentProviderForVerification,
};
