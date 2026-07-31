const EmailProvider = require('./EmailProvider');

// Logs instead of sending a real email — used when no SMTP is configured yet.
class MockEmailProvider extends EmailProvider {
  async sendEmail({ to, subject, attachments }) {
    console.log(`[MockEmailProvider] email to ${to}: ${subject}${attachments?.length ? ` (${attachments.length} attachment(s))` : ''}`);
    return { sent: true };
  }
}

module.exports = MockEmailProvider;
