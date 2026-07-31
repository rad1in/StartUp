// Static logo assets for each real payment gateway — matching provider name
// keys from backend/src/payments/index.js PROVIDER_LABELS. React Native's
// packager needs static `require()` calls (not dynamic paths), hence the map.
export const GATEWAY_LOGOS = {
  zarinpal: require('../../assets/gateways/zarinpal.png'),
  saman: require('../../assets/gateways/saman.png'),
  payping: require('../../assets/gateways/payping.png'),
  zibal: require('../../assets/gateways/zibal.png'),
  aqayepardakht: require('../../assets/gateways/aqayepardakht.png'),
};
