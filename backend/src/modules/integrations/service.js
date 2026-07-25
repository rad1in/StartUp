const { config } = require('../../config/config');
const { getSetting, setSetting } = require('../../lib/platformSettings');
const { logActivity } = require('../../lib/activityLog');
const { AVAILABLE_PROVIDERS, PROVIDER_LABELS } = require('../../payments');

async function getStatus() {
  const mockOutcome = await getSetting('payment.mockOutcome', process.env.MOCK_PAYMENT_OUTCOME || 'success');
  const smsProvider = await getSetting('sms.provider', config.smsProvider);
  const melipayamakApiKey = await getSetting('sms.melipayamak.apiKey', '');
  const melipayamakFrom = await getSetting('sms.melipayamak.from', '');

  const aqayepardakhtPin = await getSetting('payment.aqayepardakht.pin', '');
  const samanTerminalId = await getSetting('payment.saman.terminalId', '');
  const zarinpalMerchantId = await getSetting('payment.zarinpal.merchantId', '');
  const zibalMerchant = await getSetting('payment.zibal.merchant', '');
  const paypingAccessToken = await getSetting('payment.payping.accessToken', '');

  return {
    payment: {
      mockOutcome,
      availableProviders: AVAILABLE_PROVIDERS,
      providerLabels: PROVIDER_LABELS,
      // Never echo real secrets back to the browser once set — only whether
      // one is configured, so the admin form can show "تنظیم شده" instead of
      // leaking the credential into every page load.
      aqayepardakht: {
        enabled: Boolean(await getSetting('payment.aqayepardakht.enabled', false)),
        configured: Boolean(aqayepardakhtPin),
        sandbox: Boolean(await getSetting('payment.aqayepardakht.sandbox', true)),
      },
      saman: {
        enabled: Boolean(await getSetting('payment.saman.enabled', false)),
        configured: Boolean(samanTerminalId),
      },
      zarinpal: {
        enabled: Boolean(await getSetting('payment.zarinpal.enabled', false)),
        configured: Boolean(zarinpalMerchantId),
        sandbox: Boolean(await getSetting('payment.zarinpal.sandbox', true)),
      },
      zibal: {
        enabled: Boolean(await getSetting('payment.zibal.enabled', false)),
        configured: Boolean(zibalMerchant),
      },
      payping: {
        enabled: Boolean(await getSetting('payment.payping.enabled', false)),
        configured: Boolean(paypingAccessToken),
      },
    },
    sms: {
      provider: smsProvider,
      availableProviders: ['mock', 'melipayamak'],
      melipayamak: {
        // Same rules as payment credentials — never echo the real token back.
        configured: Boolean(melipayamakApiKey || config.sms.melipayamakOtpToken),
        from: melipayamakFrom,
      },
    },
    email: {
      provider: await getSetting('email.provider', config.emailProvider),
      availableProviders: ['mock', 'smtp'],
      smtp: {
        configured: Boolean(await getSetting('email.smtp.pass', '')),
        host: await getSetting('email.smtp.host', ''),
        port: await getSetting('email.smtp.port', 587),
        secure: Boolean(await getSetting('email.smtp.secure', false)),
        user: await getSetting('email.smtp.user', ''),
        fromAddress: await getSetting('email.smtp.fromAddress', ''),
        fromName: await getSetting('email.smtp.fromName', 'ET-Cafe'),
      },
    },
    captcha: {
      enabled: Boolean(await getSetting('captcha.enabled', false)),
      provider: 'hcaptcha',
      siteKey: await getSetting('captcha.hcaptcha.siteKey', ''),
      configured: Boolean(await getSetting('captcha.hcaptcha.secretKey', '')),
    },
    analytics: {
      // GA4's measurement ID is not a secret (it's shipped in every page's
      // HTML) — echoed back in full like the hCaptcha site key.
      enabled: Boolean(await getSetting('analytics.ga4.enabled', false)),
      measurementId: await getSetting('analytics.ga4.measurementId', ''),
    },
    neshan: {
      configured: Boolean(config.neshanApiKey),
    },
  };
}

async function updatePaymentSettings(
  {
    mockOutcome,
    aqayepardakhtEnabled, aqayepardakhtPin, aqayepardakhtSandbox,
    samanEnabled, samanTerminalId,
    zarinpalEnabled, zarinpalMerchantId, zarinpalSandbox,
    zibalEnabled, zibalMerchant,
    paypingEnabled, paypingAccessToken,
  },
  actingUserId
) {
  if (mockOutcome !== undefined) await setSetting('payment.mockOutcome', mockOutcome);

  if (aqayepardakhtEnabled !== undefined) await setSetting('payment.aqayepardakht.enabled', Boolean(aqayepardakhtEnabled));
  if (aqayepardakhtPin !== undefined) await setSetting('payment.aqayepardakht.pin', aqayepardakhtPin);
  if (aqayepardakhtSandbox !== undefined) await setSetting('payment.aqayepardakht.sandbox', Boolean(aqayepardakhtSandbox));

  if (samanEnabled !== undefined) await setSetting('payment.saman.enabled', Boolean(samanEnabled));
  if (samanTerminalId !== undefined) await setSetting('payment.saman.terminalId', samanTerminalId);

  if (zarinpalEnabled !== undefined) await setSetting('payment.zarinpal.enabled', Boolean(zarinpalEnabled));
  if (zarinpalMerchantId !== undefined) await setSetting('payment.zarinpal.merchantId', zarinpalMerchantId);
  if (zarinpalSandbox !== undefined) await setSetting('payment.zarinpal.sandbox', Boolean(zarinpalSandbox));

  if (zibalEnabled !== undefined) await setSetting('payment.zibal.enabled', Boolean(zibalEnabled));
  if (zibalMerchant !== undefined) await setSetting('payment.zibal.merchant', zibalMerchant);

  if (paypingEnabled !== undefined) await setSetting('payment.payping.enabled', Boolean(paypingEnabled));
  if (paypingAccessToken !== undefined) await setSetting('payment.payping.accessToken', paypingAccessToken);

  await logActivity(null, actingUserId, 'INTEGRATION_PAYMENT_UPDATED', 'PlatformSetting', null, {
    mockOutcome,
    aqayepardakhtEnabled, aqayepardakhtPinChanged: aqayepardakhtPin !== undefined, aqayepardakhtSandbox,
    samanEnabled, samanTerminalIdChanged: samanTerminalId !== undefined,
    zarinpalEnabled, zarinpalMerchantIdChanged: zarinpalMerchantId !== undefined, zarinpalSandbox,
    zibalEnabled, zibalMerchantChanged: zibalMerchant !== undefined,
    paypingEnabled, paypingAccessTokenChanged: paypingAccessToken !== undefined,
  });
  return getStatus();
}

async function updateSmsSettings({ provider, melipayamakApiKey, melipayamakFrom }, actingUserId) {
  if (provider !== undefined) await setSetting('sms.provider', provider);
  if (melipayamakApiKey !== undefined) await setSetting('sms.melipayamak.apiKey', melipayamakApiKey);
  if (melipayamakFrom !== undefined) await setSetting('sms.melipayamak.from', melipayamakFrom);
  await logActivity(null, actingUserId, 'INTEGRATION_SMS_UPDATED', 'PlatformSetting', null, {
    provider,
    melipayamakApiKeyChanged: melipayamakApiKey !== undefined,
    melipayamakFrom,
  });
  return getStatus();
}

async function updateEmailSettings(
  { provider, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFromAddress, smtpFromName },
  actingUserId
) {
  if (provider !== undefined) await setSetting('email.provider', provider);
  if (smtpHost !== undefined) await setSetting('email.smtp.host', smtpHost);
  if (smtpPort !== undefined) await setSetting('email.smtp.port', Number(smtpPort));
  if (smtpSecure !== undefined) await setSetting('email.smtp.secure', Boolean(smtpSecure));
  if (smtpUser !== undefined) await setSetting('email.smtp.user', smtpUser);
  if (smtpPass !== undefined) await setSetting('email.smtp.pass', smtpPass);
  if (smtpFromAddress !== undefined) await setSetting('email.smtp.fromAddress', smtpFromAddress);
  if (smtpFromName !== undefined) await setSetting('email.smtp.fromName', smtpFromName);
  await logActivity(null, actingUserId, 'INTEGRATION_EMAIL_UPDATED', 'PlatformSetting', null, {
    provider,
    smtpHost, smtpPort, smtpSecure, smtpUser,
    smtpPassChanged: smtpPass !== undefined,
    smtpFromAddress, smtpFromName,
  });
  return getStatus();
}

async function updateCaptchaSettings({ enabled, hcaptchaSiteKey, hcaptchaSecretKey }, actingUserId) {
  if (enabled !== undefined) await setSetting('captcha.enabled', Boolean(enabled));
  if (hcaptchaSiteKey !== undefined) await setSetting('captcha.hcaptcha.siteKey', hcaptchaSiteKey);
  if (hcaptchaSecretKey !== undefined) await setSetting('captcha.hcaptcha.secretKey', hcaptchaSecretKey);
  await logActivity(null, actingUserId, 'INTEGRATION_CAPTCHA_UPDATED', 'PlatformSetting', null, {
    enabled,
    hcaptchaSiteKey,
    hcaptchaSecretKeyChanged: hcaptchaSecretKey !== undefined,
  });
  return getStatus();
}

async function updateAnalyticsSettings({ enabled, measurementId }, actingUserId) {
  if (enabled !== undefined) await setSetting('analytics.ga4.enabled', Boolean(enabled));
  if (measurementId !== undefined) await setSetting('analytics.ga4.measurementId', measurementId);
  await logActivity(null, actingUserId, 'INTEGRATION_ANALYTICS_UPDATED', 'PlatformSetting', null, {
    enabled,
    measurementId,
  });
  return getStatus();
}

module.exports = {
  getStatus,
  updatePaymentSettings,
  updateSmsSettings,
  updateEmailSettings,
  updateCaptchaSettings,
  updateAnalyticsSettings,
};
