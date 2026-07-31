const PaymentProvider = require('./PaymentProvider');
const { config } = require('../config/config');

/**
 * ZarinPal REST API v4. Amounts here are Toman (currency: "IRT"), matching
 * the rest of this codebase — no ×10 conversion needed, unlike Saman.
 *   1. POST /pg/v4/payment/request.json -> { data: { code, authority } }
 *   2. Redirect to /pg/StartPay/{authority}
 *   3. Bank redirects back to callback_url with ?Authority=...&Status=OK|NOK
 *      (query string, so this reuses the frontend-redirect pattern like
 *      AqayePardakht — no dedicated backend callback route needed).
 *   4. POST /pg/v4/payment/verify.json { merchant_id, amount, authority }
 *      -> code 100 (first-time success) or 101 (already verified) both count.
 */
class ZarinpalProvider extends PaymentProvider {
  constructor({ merchantId, sandbox = false, callbackUrl } = {}) {
    super();
    this.merchantId = merchantId;
    this.sandbox = !!sandbox;
    this.callbackUrl = callbackUrl;
    this.base = sandbox ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
  }

  requireMerchant() {
    if (!this.merchantId) {
      const err = new Error('کد پذیرنده درگاه زرین‌پال تنظیم نشده است.');
      err.status = 503;
      throw err;
    }
  }

  async createPayment(order) {
    this.requireMerchant();
    const amount = Math.round(Number(order.totalAmount));

    const res = await fetch(`${this.base}/pg/v4/payment/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount,
        currency: 'IRT',
        description: `پرداخت سفارش ${order.id}`,
        callback_url: this.callbackUrl,
      }),
    });
    const data = await res.json().catch(() => ({}));
    const authority = data?.data?.authority;

    if (data?.data?.code !== 100 || !authority) {
      const err = new Error('ایجاد تراکنش در درگاه زرین‌پال ناموفق بود.');
      err.status = 502;
      throw err;
    }

    return {
      status: 'PENDING',
      providerRef: authority,
      redirectUrl: `${this.base}/pg/StartPay/${authority}`,
      amount,
    };
  }

  async verifyPayment(authority, amount) {
    this.requireMerchant();

    const res = await fetch(`${this.base}/pg/v4/payment/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount: Math.round(Number(amount)),
        authority,
      }),
    });
    const data = await res.json().catch(() => ({}));
    const code = data?.data?.code;
    const status = [100, 101].includes(code) ? 'SUCCESS' : 'FAILED';
    return { status, providerRef: authority };
  }
}

function buildZarinpalCallbackUrl() {
  return `${config.siteUrl}/payments/zarinpal/callback`;
}

module.exports = { ZarinpalProvider, buildZarinpalCallbackUrl };
