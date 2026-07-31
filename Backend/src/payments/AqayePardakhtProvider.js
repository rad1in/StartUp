const PaymentProvider = require('./PaymentProvider');
const { config } = require('../config/config');

const BASE_URL = 'https://panel.aqayepardakht.ir';

/**
 * AqayePardakht (aqayepardakht.ir) — an Iranian payment-gateway aggregator.
 * API docs: create -> POST /api/v2/create, redirect user to
 * /startpay/{transid} (or /startpay/sandbox/{transid} in sandbox mode), then
 * verify -> POST /api/v2/verify once the bank redirects back to our callback.
 *
 * Requires a gateway PIN (issued by AqayePardakht once the merchant account
 * is approved) — until one is configured this provider throws rather than
 * silently pretending to work, so checkout falls back to being visibly
 * broken instead of quietly mis-charging anyone. The platform admin keeps
 * `payment.provider` set to 'mock' until a PIN is entered and the provider
 * is deliberately switched over (see modules/integrations).
 */
class AqayePardakhtProvider extends PaymentProvider {
  constructor({ pin, sandbox = false, callbackUrl } = {}) {
    super();
    this.pin = pin;
    this.sandbox = !!sandbox;
    this.callbackUrl = callbackUrl;
  }

  requirePin() {
    if (!this.pin) {
      const err = new Error('کد پین درگاه پرداخت تنظیم نشده است.');
      err.status = 503;
      throw err;
    }
  }

  async createPayment(order) {
    this.requirePin();
    const amount = Math.round(Number(order.totalAmount));

    const res = await fetch(`${BASE_URL}/api/v2/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pin: this.pin,
        amount,
        callback: this.callbackUrl,
        callback_method: 'GET',
        invoice_id: order.id,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (data.status !== 'success') {
      const err = new Error('ایجاد تراکنش در درگاه پرداخت ناموفق بود.');
      err.status = 502;
      throw err;
    }

    const startpayPath = this.sandbox ? `/startpay/sandbox/${data.transid}` : `/startpay/${data.transid}`;
    return {
      status: 'PENDING',
      providerRef: data.transid,
      redirectUrl: `${BASE_URL}${startpayPath}`,
      amount,
    };
  }

  async verifyPayment(providerRef, amount) {
    this.requirePin();

    const res = await fetch(`${BASE_URL}/api/v2/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: this.pin, amount: Math.round(Number(amount)), transid: providerRef }),
    });
    const data = await res.json().catch(() => ({}));

    // code '1' = paid successfully, '2' = already verified/paid earlier —
    // both mean the order should be marked SUCCESS; anything else is a fail.
    const status = data.status === 'success' && ['1', '2'].includes(String(data.code)) ? 'SUCCESS' : 'FAILED';
    return { status, providerRef };
  }
}

// A single fixed callback URL (required to match the domain verified with
// AqayePardakht) — the actual order is identified via `invoice_id` (which we
// send as the order id at create time) and `transid`, both echoed back by
// the bank on redirect, so no query string needs to be pre-baked in here.
function buildCallbackUrl() {
  return `${config.siteUrl}/payments/aqayepardakht/callback`;
}

module.exports = { AqayePardakhtProvider, buildCallbackUrl };
