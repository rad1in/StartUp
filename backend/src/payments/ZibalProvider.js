const PaymentProvider = require('./PaymentProvider');
const { config } = require('../config/config');

const BASE_URL = 'https://gateway.zibal.ir';

/**
 * Zibal IPG (gateway.zibal.ir). Amounts are Rial — ×10 from this codebase's
 * Toman, same convention as Saman.
 *   1. POST /v1/request { merchant, amount, callbackUrl, orderId } -> { trackId, result: 100 }
 *   2. Redirect to GET /start/{trackId}
 *   3. Bank redirects back to callbackUrl via GET with
 *      ?success=1&trackId=...&orderId=...&status=... (query string — same
 *      frontend-redirect pattern as AqayePardakht/ZarinPal, no dedicated
 *      backend callback route needed; we use the standard method, not lazy).
 *   4. POST /v1/verify { merchant, trackId } -> { result: 100, status: 1 }
 *
 * `merchant` doubles as the sandbox flag: the literal string "zibal" is
 * Zibal's own shared test merchant — used automatically whenever no real
 * merchant code has been configured yet, but real payments still require
 * a real merchant code before requireMerchant() will let anything past.
 */
class ZibalProvider extends PaymentProvider {
  constructor({ merchant, callbackUrl } = {}) {
    super();
    this.merchant = merchant;
    this.callbackUrl = callbackUrl;
  }

  requireMerchant() {
    if (!this.merchant) {
      const err = new Error('کد پذیرنده درگاه زیبال تنظیم نشده است.');
      err.status = 503;
      throw err;
    }
  }

  async createPayment(order) {
    this.requireMerchant();
    const amountRial = Math.round(Number(order.totalAmount)) * 10;

    const res = await fetch(`${BASE_URL}/v1/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant: this.merchant,
        amount: amountRial,
        callbackUrl: this.callbackUrl,
        orderId: order.id,
        description: `پرداخت سفارش ${order.id}`,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (data.result !== 100 || !data.trackId) {
      const err = new Error('ایجاد تراکنش در درگاه زیبال ناموفق بود.');
      err.status = 502;
      throw err;
    }

    return {
      status: 'PENDING',
      providerRef: String(data.trackId),
      redirectUrl: `${BASE_URL}/start/${data.trackId}`,
      amount: amountRial,
    };
  }

  async verifyPayment(trackId) {
    this.requireMerchant();

    const res = await fetch(`${BASE_URL}/v1/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant: this.merchant, trackId: Number(trackId) }),
    });
    const data = await res.json().catch(() => ({}));

    // result 100 = verified now, 201 = already verified — both success.
    const status = [100, 201].includes(data.result) ? 'SUCCESS' : 'FAILED';
    return { status, providerRef: String(trackId) };
  }
}

function buildZibalCallbackUrl() {
  return `${config.siteUrl}/payments/zibal/callback`;
}

module.exports = { ZibalProvider, buildZibalCallbackUrl };
