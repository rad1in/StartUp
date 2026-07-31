const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById } = require('../../lib/sqlHelpers');
const { computeInvoiceTotals } = require('../../utils/taxInvoice');

// MariaDB's JSON type is a TEXT alias, so mysql2 doesn't know to auto-parse
// it from column metadata — comes back as a string, parsed defensively here
// (same pattern used for Venue.tags elsewhere in this codebase).
function parsePayload(row) {
  if (!row) return row;
  if (typeof row.payload === 'string') {
    try {
      row.payload = JSON.parse(row.payload);
    } catch {
      /* leave as-is */
    }
  }
  return row;
}

async function getForOrder(orderId) {
  const [[row]] = await pool.query('SELECT * FROM `TaxInvoice` WHERE orderId = ?', [orderId]);
  return parsePayload(row) || null;
}

async function listForVenue(venueId) {
  const [rows] = await pool.query('SELECT * FROM `TaxInvoice` WHERE venueId = ? ORDER BY serialNumber DESC', [venueId]);
  return rows.map(parsePayload);
}

// Auto-invoked on successful payment (see payments/service.js) and also
// callable manually from the venue accounting panel for orders that
// predate the venue configuring its economic code. Silently no-ops when the
// venue hasn't set an economic code yet — that field's presence is what
// "enables" tax invoicing for a venue, same pattern as payment gateways.
async function generateForOrder(order) {
  const existing = await getForOrder(order.id);
  if (existing) return existing;

  const venue = await findById('Venue', order.venueId);
  if (!venue?.economicCode) return null;

  const totals = computeInvoiceTotals(order);
  let buyerName = null;
  if (order.customerId) {
    const [[customer]] = await pool.query('SELECT name FROM `User` WHERE id = ?', [order.customerId]);
    buyerName = customer?.name || null;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[{ maxSerial }]] = await connection.query(
      'SELECT COALESCE(MAX(serialNumber), 0) AS maxSerial FROM `TaxInvoice` WHERE venueId = ? FOR UPDATE',
      [order.venueId]
    );
    const serialNumber = Number(maxSerial) + 1;
    const id = randomUUID();

    // Structural snapshot mirroring the top-level fields of سامانه مودیان's
    // "نسخه 3" invoice schema (seller/buyer/items/totals) — kept as JSON so
    // the exact shape can be adjusted freely once a real submission gateway
    // is chosen, without a schema migration.
    const payload = {
      invoiceType: 'SALE',
      serialNumber,
      issueDate: new Date().toISOString(),
      seller: {
        economicCode: venue.economicCode,
        legalName: venue.legalName || venue.name,
        nationalId: venue.nationalId || null,
        postalCode: venue.postalCode || null,
      },
      buyer: { name: buyerName },
      items: (order.items || []).map((item) => ({
        description: item.menuItem?.name || item.combo?.name || 'Item',
        quantity: item.quantity,
        unitPrice: Number(item.subtotal) / item.quantity,
        subtotal: Number(item.subtotal),
      })),
      totals,
    };

    await connection.query(
      `INSERT INTO \`TaxInvoice\`
        (id, venueId, orderId, serialNumber, issueDate, sellerEconomicCode, sellerLegalName, buyerName,
         subtotal, discountTotal, vatRate, vatAmount, totalAmount, status, payload)
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', ?)`,
      [
        id, order.venueId, order.id, serialNumber, venue.economicCode, venue.legalName || venue.name, buyerName,
        totals.subtotal, totals.discountTotal, totals.vatRate, totals.vatAmount, totals.totalAmount,
        JSON.stringify(payload),
      ]
    );
    await connection.commit();
    return parsePayload(await findById('TaxInvoice', id));
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { getForOrder, listForVenue, generateForOrder };
