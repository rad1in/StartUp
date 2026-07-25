const https = require('https');

// hCaptcha's own verification endpoint (https://docs.hcaptcha.com/#verify-the-user-response-server-side).
// A plain POST with no library dependency, matching the style already used
// for Melipayamak's REST calls in this codebase.
function verifyToken(secretKey, token, remoteIp) {
  return new Promise((resolve) => {
    const body = new URLSearchParams({ secret: secretKey, response: token || '' });
    if (remoteIp) body.append('remoteip', remoteIp);
    const payload = body.toString();

    const req = https.request(
      {
        hostname: 'hcaptcha.com',
        port: 443,
        path: '/siteverify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(Boolean(JSON.parse(data).success));
          } catch {
            resolve(false);
          }
        });
      }
    );
    req.on('error', () => resolve(false));
    req.write(payload);
    req.end();
  });
}

module.exports = { verifyToken };
