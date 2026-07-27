const https = require('https');
const SmsProvider = require('./SmsProvider');
const { config } = require('../config/config');
const { getSetting } = require('../lib/platformSettings');

/**
 * Melipayamak's token-based REST API (console.melipayamak.com/api/send/<method>/<token>).
 * One account token drives every method below (OTP, simple, advanced, scheduled,
 * shared-line, multiple) — confirmed from the account's own docs, where every
 * example path carries the same token segment. The token is admin-editable via
 * platformSettings (sms.melipayamak.apiKey) so it lives in the Integrations
 * panel like the payment gateways, but falls back to the legacy
 * MELIPAYAMAK_OTP_TOKEN env var so existing OTP-login setups keep working
 * untouched.
 */
class MelipayamakSmsProvider extends SmsProvider {
  async getToken() {
    const token = (await getSetting('sms.melipayamak.apiKey', '')) || config.sms.melipayamakOtpToken;
    if (!token) {
      const err = new Error('کد اختصاصی ملی‌پیامک تنظیم نشده است.');
      err.status = 503;
      throw err;
    }
    return token;
  }

  async getFrom() {
    return getSetting('sms.melipayamak.from', '');
  }

  async postJson(path, payload) {
    const body = JSON.stringify(payload);
    const options = {
      hostname: 'console.melipayamak.com',
      port: 443,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    try {
      return JSON.parse(response.data);
    } catch {
      return {};
    }
  }

  async sendOtp(phone) {
    const token = await this.getToken();
    const parsed = await this.postJson(`/api/send/otp/${token}`, { to: phone });
    if (!parsed.code) {
      const err = new Error(parsed.status || 'ارسال پیامک با خطا مواجه شد.');
      err.status = 502;
      throw err;
    }
    return { sent: true, code: String(parsed.code) };
  }

  // Free text to a single number — used for digital receipts, order
  // confirmations, and anything else that isn't a marketing broadcast.
  async sendText(phone, message) {
    const token = await this.getToken();
    const from = await this.getFrom();
    const parsed = await this.postJson(`/api/send/simple/${token}`, { from, to: phone, text: message });
    if (!parsed.recId) {
      const err = new Error(parsed.status || 'ارسال پیامک با خطا مواجه شد.');
      err.status = 502;
      throw err;
    }
    return { sent: true, recId: parsed.recId };
  }

  // Same text to many numbers in one call — used by venue marketing
  // campaigns (see modules/smsCampaigns).
  async sendBulk(phones, message) {
    const token = await this.getToken();
    const from = await this.getFrom();
    const parsed = await this.postJson(`/api/send/advanced/${token}`, { from, to: phones, text: message, udh: '' });
    if (!Array.isArray(parsed.recIds)) {
      const err = new Error(parsed.status || 'ارسال پیامک با خطا مواجه شد.');
      err.status = 502;
      throw err;
    }
    return { sent: true, recIds: parsed.recIds };
  }

  // Different text per recipient, same call — kept for future use (e.g.
  // per-customer personalized promos); not currently wired to any feature.
  async sendMultiple(phones, texts) {
    const token = await this.getToken();
    const from = await this.getFrom();
    const parsed = await this.postJson(`/api/send/multiple/${token}`, { from, to: phones, text: texts, udh: '' });
    if (!Array.isArray(parsed.recIds)) {
      const err = new Error(parsed.status || 'ارسال پیامک با خطا مواجه شد.');
      err.status = 502;
      throw err;
    }
    return { sent: true, recIds: parsed.recIds, success: parsed.success || [] };
  }

  async sendScheduled(phone, message, date, period) {
    const token = await this.getToken();
    const from = await this.getFrom();
    const parsed = await this.postJson(`/api/send/schedule/${token}`, {
      message,
      from,
      to: phone,
      date,
      period: period || undefined,
    });
    if (!parsed.id) {
      const err = new Error(parsed.status || 'زمان‌بندی پیامک با خطا مواجه شد.');
      err.status = 502;
      throw err;
    }
    return { sent: true, id: parsed.id };
  }

  // Requires a pre-approved bodyId in the Melipayamak console (shared/
  // service-line template) — not used by any feature yet, kept available.
  async sendShared(bodyId, phone, args) {
    const token = await this.getToken();
    const parsed = await this.postJson(`/api/send/shared/${token}`, { bodyId, to: phone, args: args || [] });
    if (!parsed.recId) {
      const err = new Error(parsed.status || 'ارسال پیامک با خطا مواجه شد.');
      err.status = 502;
      throw err;
    }
    return { sent: true, recId: parsed.recId };
  }
}

module.exports = MelipayamakSmsProvider;
