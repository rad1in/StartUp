/**
 * Abstract SMS provider. A real gateway (Melipayamak, Kavenegar, Twilio, …)
 * extends this and is registered in sms/index.js — nothing outside this folder
 * should depend on a specific provider's API shape.
 *
 * Contract: `sendOtp(phone)` sends a one-time code and RESOLVES WITH the code
 * that was actually sent — `{ sent: true, code: '123456' }` — so the caller can
 * store its hash. The provider owns code generation (some gateways generate it).
 */
class SmsProvider {
  // eslint-disable-next-line no-unused-vars
  async sendOtp(phone) {
    throw new Error('sendOtp must be implemented by the SMS provider');
  }

  // Free-text SMS (e.g. digital receipts) — separate from sendOtp because
  // most gateways require a distinct, pre-approved API/template for
  // arbitrary text vs. their fixed OTP template.
  // eslint-disable-next-line no-unused-vars
  async sendText(phone, message) {
    throw new Error('sendText must be implemented by the SMS provider');
  }

  // Same text to many numbers — used by venue marketing campaigns.
  // eslint-disable-next-line no-unused-vars
  async sendBulk(phones, message) {
    throw new Error('sendBulk must be implemented by the SMS provider');
  }
}

module.exports = SmsProvider;
