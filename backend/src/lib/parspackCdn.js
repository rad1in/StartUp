const https = require('https');
const { config } = require('../config/config');

// Thin wrapper around Parspack's CDN/WAF control API (https://my.parspack.com)
// for the one domain zone this platform actually manages. Deliberately
// exposes only the handful of security-relevant operations actually used —
// not a full client for the ~100-endpoint API (DNS, load balancing, SSL,
// etc. are one-time setup done directly in Parspack's own dashboard).
const BASE_HOST = 'my.parspack.com';
const BASE_PATH = '/cdnapi/external/api/v1/zones';

function isConfigured() {
  return Boolean(config.parspackCdn.apiKey && config.parspackCdn.zoneUuid);
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) {
      const err = new Error('CDN Parspack تنظیم نشده است.');
      err.status = 503;
      return reject(err);
    }
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: BASE_HOST,
      port: 443,
      path: `${BASE_PATH}/${config.parspackCdn.zoneUuid}${path}`,
      method,
      headers: {
        Authorization: `Bearer ${config.parspackCdn.apiKey}`,
        Accept: 'application/json',
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          return reject(new Error('پاسخ نامعتبر از Parspack.'));
        }
        if (!parsed.success) {
          return reject(new Error(parsed.message || 'درخواست به Parspack ناموفق بود.'));
        }
        resolve(parsed.data);
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function getDdosAction() {
  return request('GET', '/ddos-actions');
}

async function setDdosAction(action, trustTime = 3600, banTime = 900) {
  return request('PUT', '/ddos-actions', { action, trust_time: trustTime, ban_time: banTime });
}

async function getIpReputation() {
  return request('GET', '/firewalls/ip-reputation');
}

async function setIpReputation({ enabled, trustTime = 3600, treatScore = 'medium', challenge = 'recaptcha', banTime = 900 }) {
  return request('PUT', '/firewalls/ip-reputation', {
    ip_reputation_enabled: enabled,
    ip_reputation_trust_time: trustTime,
    ip_reputation_treat_score: treatScore,
    ip_reputation_challenge: challenge,
    attack_ban_time: banTime,
  });
}

async function getModSecStandards() {
  return request('GET', '/firewalls/mod-security');
}

async function setModSecRules(ruleIds) {
  return request('PUT', '/firewalls/mod-security/rules', { modsec_rules: ruleIds });
}

// Combined read for the admin panel's status card — one call, three facts.
async function getSecurityStatus() {
  const [ddos, ipReputation, modSec] = await Promise.all([getDdosAction(), getIpReputation(), getModSecStandards()]);
  return {
    ddosAction: ddos.action,
    ipReputationEnabled: ipReputation.ip_reputation_enabled,
    wafRulesActive: modSec.standards.filter((s) => s.selected).length,
    wafRulesTotal: modSec.standards.length,
  };
}

module.exports = {
  isConfigured,
  getDdosAction,
  setDdosAction,
  getIpReputation,
  setIpReputation,
  getModSecStandards,
  setModSecRules,
  getSecurityStatus,
};
