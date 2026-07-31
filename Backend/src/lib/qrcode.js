const QRCode = require('qrcode');
const { config } = require('../config/config');

function tableOrderingUrl(venueId, tableId) {
  return `${config.corsOrigin}/menu/${venueId}?table=${tableId}`;
}

async function renderTableQrPng(venueId, tableId) {
  const url = tableOrderingUrl(venueId, tableId);
  return QRCode.toBuffer(url, { type: 'png', width: 400, margin: 2 });
}

// Shareable invite link for a shared-table group-ordering session — anyone
// opening this lands on the same menu page pre-joined to the same session.
function tableSessionUrl(venueId, tableId, sessionId) {
  return `${config.corsOrigin}/menu/${venueId}?table=${tableId}&session=${sessionId}`;
}

async function renderSessionInvitePng(venueId, tableId, sessionId) {
  const url = tableSessionUrl(venueId, tableId, sessionId);
  return QRCode.toBuffer(url, { type: 'png', width: 400, margin: 2 });
}

module.exports = { tableOrderingUrl, renderTableQrPng, tableSessionUrl, renderSessionInvitePng };
