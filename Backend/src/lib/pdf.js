const { PassThrough } = require('stream');
const PDFDocument = require('pdfkit');

// Collects a PDF into a Buffer instead of streaming it to an HTTP response —
// used for email attachments, where render(passthroughStream) is one of the
// existing render*Pdf(doc, stream) functions above.
function renderToBuffer(render, ...args) {
  return new Promise((resolve, reject) => {
    const stream = new PassThrough();
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    render(...args, stream);
  });
}

function renderReceiptPdf(order, res) {
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  doc.fontSize(18).text('Order Receipt', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Order ID: ${order.id}`);
  doc.text(`Venue: ${order.venue?.name || order.venueId}`);
  doc.text(`Date: ${new Date(order.createdAt).toISOString()}`);
  doc.text(`Status: ${order.status}`);
  doc.text(`Payment status: ${order.paymentStatus}`);
  doc.moveDown();

  doc.fontSize(12).text('Items:', { underline: true });
  order.items.forEach((item) => {
    const name = item.menuItem?.name || item.combo?.name || 'Item';
    doc.fontSize(10).text(`${name}  x${item.quantity}  —  ${Number(item.subtotal).toLocaleString('en-US')} Toman`);
  });

  doc.moveDown();
  if (Number(order.discountAmount) > 0) {
    doc.text(`Discount: -${Number(order.discountAmount).toLocaleString('en-US')} Toman`);
  }
  doc.fontSize(12).text(`Total: ${Number(order.totalAmount).toLocaleString('en-US')} Toman`, { align: 'left' });

  doc.end();
}

function renderAccountingSummaryPdf({ venue, summary, byCategory }, res) {
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  doc.fontSize(18).text('Sales Summary Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Venue: ${venue?.name || ''}`);
  doc.text(`Period: ${summary.period}`);
  doc.text(`Since: ${new Date(summary.since).toISOString()}`);
  doc.moveDown();

  doc.fontSize(12).text('Summary:', { underline: true });
  doc.fontSize(10).text(`Orders: ${summary.orderCount}`);
  doc.text(`Total revenue: ${summary.totalRevenue.toLocaleString('en-US')} Toman`);
  doc.text(`Commission: ${summary.totalCommission.toLocaleString('en-US')} Toman`);
  doc.text(`Net revenue: ${summary.netRevenue.toLocaleString('en-US')} Toman`);
  doc.moveDown();

  doc.fontSize(12).text('Revenue by category:', { underline: true });
  byCategory.forEach((row) => {
    doc.fontSize(10).text(`${row.category}: ${row.revenue.toLocaleString('en-US')} Toman`);
  });

  doc.end();
}

function renderTaxInvoicePdf(invoice, order, venue, res) {
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  doc.fontSize(16).text('Electronic Tax Invoice', { align: 'center' });
  doc.fontSize(9).fillColor('gray').text('(صورتحساب الکترونیکی — standard format, per سامانه مودیان)', { align: 'center' });
  doc.fillColor('black');
  doc.moveDown();

  doc.fontSize(10);
  doc.text(`Serial number: ${invoice.serialNumber}`);
  doc.text(`Issue date: ${new Date(invoice.issueDate).toISOString()}`);
  doc.text(`Tax UID: ${invoice.taxUid || '— (not yet submitted to a مودیان gateway)'}`);
  doc.moveDown();

  doc.fontSize(11).text('Seller', { underline: true });
  doc.fontSize(10);
  doc.text(`Legal name: ${invoice.sellerLegalName || venue?.name || ''}`);
  doc.text(`Economic code: ${invoice.sellerEconomicCode || '—'}`);
  if (venue?.nationalId) doc.text(`National ID: ${venue.nationalId}`);
  if (venue?.postalCode) doc.text(`Postal code: ${venue.postalCode}`);
  doc.moveDown();

  doc.fontSize(11).text('Buyer', { underline: true });
  doc.fontSize(10).text(`Name: ${invoice.buyerName || 'Retail customer'}`);
  doc.moveDown();

  doc.fontSize(11).text('Items', { underline: true });
  (order.items || []).forEach((item) => {
    const name = item.menuItem?.name || item.combo?.name || 'Item';
    doc.fontSize(10).text(`${name}  x${item.quantity}  —  ${Number(item.subtotal).toLocaleString('en-US')} Toman`);
  });
  doc.moveDown();

  if (Number(invoice.discountTotal) > 0) {
    doc.fontSize(10).text(`Discount: -${Number(invoice.discountTotal).toLocaleString('en-US')} Toman`);
  }
  doc.text(`Subtotal (before VAT adjustment): ${Number(invoice.subtotal).toLocaleString('en-US')} Toman`);
  doc.text(`VAT (${Number(invoice.vatRate)}%): ${Number(invoice.vatAmount).toLocaleString('en-US')} Toman`);
  doc.fontSize(12).text(`Total (incl. VAT): ${Number(invoice.totalAmount).toLocaleString('en-US')} Toman`, { align: 'left' });

  doc.end();
}

module.exports = { renderReceiptPdf, renderAccountingSummaryPdf, renderTaxInvoicePdf, renderToBuffer };
