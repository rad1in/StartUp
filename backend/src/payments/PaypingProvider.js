const PaymentProvider = require('./PaymentProvider');
const { config } = require('../config/config');

const BASE_URL = 'https://api.payping.ir';

/**
 * PayPing v3 (api.payping.ir). Amounts are Toman, Bearer-token auth (a
 * static access token issued from PayPing's developer console — this
 * codebase only needs the `pay:write`/`pay:read` scopes, not the full OAuth
 * user-consent flow described in their docs).
 *   1. POST /v3/pay { amount, returnUrl, clientRefId, description } -> { paymentCode }
 *   2. Redirect to GET /v3/pay/start/{paymentCode}
 *   3. PayPing itself POSTs the result to our returnUrl as
 *      application/x-www-form-urlencoded (server-to-server-ish, like Saman —
 *      handled in the dedicated callback route, not here) with
 *      clientRefId/paymentCode/paymentRefId/status.
 *   4. POST /v3/pay/verify { paymentRefId, paymentCode, amount } -> 200 = success
 *
 * verifyPayment needs BOTH paymentCode and paymentRefId, but the generic
 * verify(providerRef) contract only carries one opaque string — same
 * situation as Saman's token/RefNum split. Fixed the same way: the callback
 * handler packs both into providerRef as "paymentCode:paymentRefId" before
 * calling the generic verify(), and this class unpacks it here.
 */
class PaypingProvider extends PaymentProvider {
  constructor({ accessToken, callbackUrl } = {}) {
    super();
    this.accessToken = accessToken;
    this.callbackUrl = callbackUrl;
  }

  requireToken() {
    if (!this.accessToken) {
      const err = new Error('توکن دسترسی درگاه پی‌پینگ تنظیم نشده است.');
      err.status = 503;
      throw err;
    }
  }

  async createPayment(order) {
    this.requireToken();
    const amount = Math.round(Number(order.totalAmount));

    const res = await fetch(`${BASE_URL}/v3/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.accessToken}` },
      body: JSON.stringify({
        amount,
        returnUrl: this.callbackUrl,
        description: `پرداخت سفارش ${order.id}`,
        clientRefId: order.id,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.paymentCode) {
      const err = new Error('ایجاد تراکنش در درگاه پی‌پینگ ناموفق بود.');
      err.status = 502;
      throw err;
    }

    return {
      status: 'PENDING',
      providerRef: data.paymentCode,
      redirectUrl: `${BASE_URL}/v3/pay/start/${data.paymentCode}`,
      amount,
    };
  }

  async verifyPayment(providerRef, amount) {
    this.requireToken();
    const [paymentCode, paymentRefId] = String(providerRef).split(':');
    if (!paymentRefId) {
      // Called before the callback ever packed a real paymentRefId in —
      // there's nothing to verify yet.
      return { status: 'FAILED', providerRef };
    }

    const res = await fetch(`${BASE_URL}/v3/pay/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.accessToken}` },
      body: JSON.stringify({
        paymentRefId: Number(paymentRefId),
        paymentCode,
        amount: Math.round(Number(amount)),
      }),
    });

    return { status: res.ok ? 'SUCCESS' : 'FAILED', providerRef };
  }
}

function buildPaypingCallbackUrl() {
  return `${config.apiUrl}/payments/payping/callback`;
}

module.exports = { PaypingProvider, buildPaypingCallbackUrl };
