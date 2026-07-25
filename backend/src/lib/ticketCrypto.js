// Encrypts confidential support-ticket message bodies at rest (AES-256-GCM)
// so plaintext never sits in the database or backups. This is server-side
// encryption with restricted decrypt access (ticket owner + assigned
// support staff only) — not literal end-to-end encryption, since support
// staff have to be able to read the message to help with it. Key is
// separate from JWT_SECRET (see config.ticketEncryptionKey).
const crypto = require('crypto');
const { config } = require('../config/config');

const ALGORITHM = 'aes-256-gcm';
const key = crypto.createHash('sha256').update(config.ticketEncryptionKey).digest();

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

function decrypt(payload) {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
