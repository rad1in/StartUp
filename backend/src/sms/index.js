const { config } = require('../config/config');
const { getSetting } = require('../lib/platformSettings');
const MockSmsProvider = require('./MockSmsProvider');
const MelipayamakSmsProvider = require('./MelipayamakSmsProvider');

const providers = {
  mock: () => new MockSmsProvider(),
  melipayamak: () => new MelipayamakSmsProvider(),
};

async function getSmsProvider() {
  const providerName = (await getSetting('sms.provider', config.smsProvider)) || 'mock';
  const factory = providers[providerName] || providers.mock;
  return factory();
}

module.exports = { getSmsProvider };
