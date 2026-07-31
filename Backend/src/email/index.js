const { config } = require('../config/config');
const { getSetting } = require('../lib/platformSettings');
const MockEmailProvider = require('./MockEmailProvider');
const SmtpEmailProvider = require('./SmtpEmailProvider');

async function getEmailProvider() {
  const providerName = (await getSetting('email.provider', config.emailProvider)) || 'mock';
  if (providerName === 'smtp') {
    const [host, port, secure, user, pass, fromAddress, fromName] = await Promise.all([
      getSetting('email.smtp.host', ''),
      getSetting('email.smtp.port', 587),
      getSetting('email.smtp.secure', false),
      getSetting('email.smtp.user', ''),
      getSetting('email.smtp.pass', ''),
      getSetting('email.smtp.fromAddress', ''),
      getSetting('email.smtp.fromName', 'ET-Cafe'),
    ]);
    return new SmtpEmailProvider({ host, port, secure, user, pass, fromAddress, fromName });
  }
  return new MockEmailProvider();
}

module.exports = { getEmailProvider };
