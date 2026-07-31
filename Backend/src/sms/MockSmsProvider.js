const { randomInt } = require('crypto');
const SmsProvider = require('./SmsProvider');

/**
 * Logs the OTP instead of sending a real SMS. Generates the code itself so the
 * provider owns the code (matching real gateways like Melipayamak that generate
 * and return their own code); the caller stores the returned code hashed.
 */
class MockSmsProvider extends SmsProvider {
  async sendOtp(phone) {
    const code = randomInt(100000, 999999).toString();
    console.log(`[MockSmsProvider] ارسال کد تایید ${code} به شماره ${phone}`);
    return { sent: true, code };
  }

  async sendText(phone, message) {
    console.log(`[MockSmsProvider] پیامک به ${phone}: ${message}`);
    return { sent: true };
  }

  async sendBulk(phones, message) {
    console.log(`[MockSmsProvider] پیامک گروهی به ${phones.length} گیرنده: ${message}`);
    return { sent: true, recIds: phones.map((_, i) => i + 1) };
  }
}

module.exports = MockSmsProvider;
