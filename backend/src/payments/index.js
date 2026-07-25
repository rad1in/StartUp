const { getSetting } = require('../lib/platformSettings');
const MockPaymentProvider = require('./MockPaymentProvider');
const { AqayePardakhtProvider, buildCallbackUrl } = require('./AqayePardakhtProvider');
const { SamanProvider, buildSamanCallbackUrl } = require('./SamanProvider');
const { ZarinpalProvider, buildZarinpalCallbackUrl } = require('./ZarinpalProvider');
const { ZibalProvider, buildZibalCallbackUrl } = require('./ZibalProvider');
const { PaypingProvider, buildPaypingCallbackUrl } = require('./PaypingProvider');

// Each real gateway is independently enabled/disabled (payment.<name>.enabled)
// rather than there being one global "active provider" — the customer picks
// which one to pay with at checkout (see GET /payments/methods). "mock" is
// always available so checkout never fully breaks in a dev environment with
// nothing configured yet.
const PROVIDER_LABELS = {
  mock: 'شبیه‌سازی (Mock)',
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
    case 'mock':
    default: {
      const mockOutcome = await getSetting('payment.mockOutcome', process.env.MOCK_PAYMENT_OUTCOME || 'success');
      return new MockPaymentProvider(mockOutcome);
    }
  }
}

async function isProviderEnabled(name) {
  if (name === 'mock') return true;
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
// "unknown name" and "admin turned it off since the page loaded").
async function getPaymentProviderByName(name) {
  const providerName = name && AVAILABLE_PROVIDERS.includes(name) ? name : 'mock';
  if (!(await isProviderEnabled(providerName))) {
    const err = new Error('این روش پرداخت در حال حاضر فعال نیست.');
    err.status = 400;
    throw err;
  }
  return { provider: await buildProvider(providerName), providerName };
}

// Used when VERIFYING a payment already in flight — deliberately skips the
// enabled check, since an admin toggling a gateway off mid-transaction
// shouldn't strand a customer's already-created payment unverifiable.
async function getPaymentProviderForVerification(name) {
  const providerName = name && AVAILABLE_PROVIDERS.includes(name) ? name : 'mock';
  return { provider: await buildProvider(providerName), providerName };
}

module.exports = {
  AVAILABLE_PROVIDERS,
  PROVIDER_LABELS,
  isProviderEnabled,
  listEnabledPaymentMethods,
  getPaymentProviderByName,
  getPaymentProviderForVerification,
};
