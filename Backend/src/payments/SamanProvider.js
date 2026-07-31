const PaymentProvider = require('./PaymentProvider');
const { config } = require('../config/config');

const BASE_URL = 'https://sep.shaparak.ir';

/**
 * Saman Bank's SEP gateway (sep.shaparak.ir), token-based flow per the
 * merchant technical doc (v3.6):
 *   1. POST /onlinepg/onlinepg { action:"token", TerminalId, Amount(rial),
 *      ResNum, RedirectUrl } -> { status:1, token }
 *   2. Redirect the customer to GET /OnlinePG/SendToken?token=...
 *   3. The bank POSTs the result back to RedirectUrl with State/RefNum/ResNum
 *      (no token echoed back) — handled server-side in the callback route,
 *      NOT here, since verifyPayment needs RefNum which only exists after
 *      that POST arrives.
 *   4. POST /verifyTxnRandomSessionkey/ipg/VerifyTransaction
 *      { RefNum, TerminalNumber } -> { Success, ResultCode, TransactionDetail }
 *
 * Amounts on this gateway are Rial, not Toman — every other part of this
 * codebase works in Toman, so this provider is the one place that ×10s.
 *
 * Requires a merchant TerminalId (issued by Saman once approved). Until one
 * is configured this throws rather than silently pretending to work — same
 * convention as AqayePardakhtProvider.
 */
class SamanProvider extends PaymentProvider {
  constructor({ terminalId, callbackUrl } = {}) {
    super();
    this.terminalId = terminalId;
    this.callbackUrl = callbackUrl;
  }

  requireTerminal() {
    if (!this.terminalId) {
      const err = new Error('شناسه ترمینال درگاه سامان تنظیم نشده است.');
      err.status = 503;
      throw err;
    }
  }

  async createPayment(order) {
    this.requireTerminal();
    const amountRial = Math.round(Number(order.totalAmount)) * 10;

    const res = await fetch(`${BASE_URL}/onlinepg/onlinepg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'token',
        TerminalId: Number(this.terminalId),
        Amount: amountRial,
        ResNum: order.id,
        RedirectUrl: this.callbackUrl,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (data.status !== 1 || !data.token) {
      const err = new Error('ایجاد تراکنش در درگاه سامان ناموفق بود.');
      err.status = 502;
      throw err;
    }

    return {
      status: 'PENDING',
      providerRef: data.token,
      redirectUrl: `${BASE_URL}/OnlinePG/SendToken?token=${data.token}`,
      amount: amountRial,
    };
  }

  // Called two ways: (a) from the server-side callback handler with the real
  // RefNum once the bank POSTs back — the normal path; (b) potentially with
  // the stale pre-payment token if something calls the generic verify route
  // before the callback lands, in which case Saman will legitimately reject
  // it and this correctly reports FAILED rather than guessing SUCCESS.
  async verifyPayment(refNum) {
    this.requireTerminal();

    const res = await fetch(`${BASE_URL}/verifyTxnRandomSessionkey/ipg/VerifyTransaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ RefNum: refNum, TerminalNumber: Number(this.terminalId) }),
    });
    const data = await res.json().catch(() => ({}));

    const status = data.Success === true && Number(data.ResultCode) === 0 ? 'SUCCESS' : 'FAILED';
    return { status, providerRef: refNum };
  }
}

// Saman requires a real server endpoint (it POSTs the result directly, it
// doesn't redirect to a frontend page like AqayePardakht) — this backend's
// own callback route, not the frontend's siteUrl.
function buildSamanCallbackUrl() {
  return `${config.apiUrl}/payments/saman/callback`;
}

module.exports = { SamanProvider, buildSamanCallbackUrl };
