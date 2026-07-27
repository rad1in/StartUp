// One-off: applies the conservative CDN/WAF security baseline agreed on
// with the user for the et-cafe.com Parspack zone — previously nothing was
// enabled at all (DDoS action "none", IP reputation off, all 28 ModSecurity
// rule sets unselected). Safe to re-run; it's idempotent (just re-applies
// the same settings). See lib/parspackCdn.js for the underlying API calls.
//
// Usage: node src/scripts/configureCdnSecurity.js
const { setDdosAction, setIpReputation, setModSecRules, getSecurityStatus } = require('../lib/parspackCdn');

// Conservative, stack-relevant subset of the 28 available rule categories:
// core threat classes (SQLi/RCE/RFI/LFI), protocol sanity checks, scanner
// detection, and the Node.js/React-specific rules — skipping PHP/WordPress/
// Drupal/etc. exclusion rules and session-fixation/Java rules that don't
// apply to this stack. blocking-evaluation + correlation are the scoring/
// decision rules the others need to actually trigger a block, not just log.
const CONSERVATIVE_MODSEC_RULES = [
  'N8eRBxeO', // common-exceptions
  '8y3qxpzL', // scanner-detection
  'l8enrdea', // protocol-enforcement
  'Nne9Eme1', // protocol-attack
  '5Xg7KLg8', // application-attack-lfi
  'OMgrQy3K', // application-attack-rfi
  'Ene6rZel', // application-attack-rce
  'RKeAGr35', // nodejs
  'LnekEj3o', // application-attack-sqli
  'N8eRRxeO', // React-RCE-Attack
  'QP3dN6eR', // blocking-evaluation
  'Gwe5Yler', // correlation
];

async function main() {
  console.log('Applying CDN security baseline (Parspack)...\n');

  await setDdosAction('recaptcha');
  console.log('DDoS action -> recaptcha challenge');

  await setIpReputation({ enabled: true, treatScore: 'medium', challenge: 'recaptcha' });
  console.log('IP reputation -> enabled (medium threshold, recaptcha challenge)');

  await setModSecRules(CONSERVATIVE_MODSEC_RULES);
  console.log(`WAF (ModSecurity) -> ${CONSERVATIVE_MODSEC_RULES.length} conservative rule sets enabled`);

  const status = await getSecurityStatus();
  console.log('\nFinal status:', JSON.stringify(status, null, 2));
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
