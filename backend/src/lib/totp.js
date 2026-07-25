// RFC 6238 TOTP + RFC 4648 base32, implemented with Node's crypto so no extra
// dependency is needed. Compatible with Google Authenticator / Authy etc.
const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i += 1) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input) {
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < clean.length; i += 1) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// A fresh random base32 secret for a new 2FA enrollment.
function generateSecret(length = 20) {
  return base32Encode(crypto.randomBytes(length));
}

function hotp(secretBase32, counter) {
  const key = base32Decode(secretBase32);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, '0');
}

// Verify a user-supplied 6-digit code, tolerating ±1 time step (30s) of clock
// drift between the phone and the server.
function verifyToken(secretBase32, token, window = 1) {
  if (!secretBase32 || !token) return false;
  const counter = Math.floor(Date.now() / 1000 / 30);
  const clean = String(token).replace(/\s/g, '');
  for (let i = -window; i <= window; i += 1) {
    if (hotp(secretBase32, counter + i) === clean) return true;
  }
  return false;
}

// otpauth:// URI that authenticator apps import from a QR code.
function otpauthUrl(secretBase32, label, issuer = 'ET-Cafe') {
  const l = encodeURIComponent(`${issuer}:${label}`);
  return `otpauth://totp/${l}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

module.exports = { generateSecret, verifyToken, otpauthUrl, base32Encode, base32Decode };
