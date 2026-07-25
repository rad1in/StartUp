const service = require('./service');
const ordersService = require('../orders/service');
const { findById } = require('../../lib/sqlHelpers');
const { pool } = require('../../lib/db');
const { renderTaxInvoicePdf, renderToBuffer } = require('../../lib/pdf');
const { getEmailProvider } = require('../../email');

async function listForVenue(req, res, next) {
  try {
    res.json(await service.listForVenue(req.params.venueId));
  } catch (err) {
    next(err);
  }
}

async function generateForOrder(req, res, next) {
  try {
    const order = await ordersService.getOrder(req.params.orderId);
    if (order.venueId !== req.params.venueId) {
      return res.status(403).json({ message: 'دسترسی مجاز نیست.' });
    }
    const invoice = await service.generateForOrder(order);
    if (!invoice) {
      return res.status(400).json({ message: 'برای صدور فاکتور رسمی، ابتدا کد اقتصادی کافه را در تنظیمات وارد کنید.' });
    }
    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
}

async function downloadForOrder(req, res, next) {
  try {
    const order = await ordersService.getOrder(req.params.id);
    const isOwnerCustomer = req.user.role === 'CUSTOMER' && order.customerId === req.user.id;
    const isVenueStaff = ['VENUE_OWNER', 'VENUE_STAFF'].includes(req.user.role) && req.user.venueId === order.venueId;
    if (!isOwnerCustomer && !isVenueStaff && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'دسترسی به این فاکتور مجاز نیست.' });
    }

    const invoice = await service.getForOrder(order.id);
    if (!invoice) {
      return res.status(404).json({ message: 'فاکتور رسمی برای این سفارش صادر نشده است.' });
    }
    const venue = await findById('Venue', order.venueId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="tax-invoice-${invoice.serialNumber}.pdf"`);
    renderTaxInvoicePdf(invoice, order, venue, res);
  } catch (err) {
    next(err);
  }
}

// Mobile doesn't have an in-app PDF viewer, so it offers "email it to me"
// instead of a raw download — reuses the same PDF renderer and access rules
// as downloadForOrder.
async function emailForOrder(req, res, next) {
  try {
    const order = await ordersService.getOrder(req.params.id);
    const isOwnerCustomer = req.user.role === 'CUSTOMER' && order.customerId === req.user.id;
    const isVenueStaff = ['VENUE_OWNER', 'VENUE_STAFF'].includes(req.user.role) && req.user.venueId === order.venueId;
    if (!isOwnerCustomer && !isVenueStaff && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'دسترسی به این فاکتور مجاز نیست.' });
    }

    const invoice = await service.getForOrder(order.id);
    if (!invoice) {
      return res.status(404).json({ message: 'فاکتور رسمی برای این سفارش صادر نشده است.' });
    }
    const venue = await findById('Venue', order.venueId);

    let email = req.body.email;
    if (!email && order.customerId) {
      const [[customer]] = await pool.query('SELECT email FROM `User` WHERE id = ?', [order.customerId]);
      email = customer?.email;
    }
    if (!email) return res.status(400).json({ message: 'آدرس ایمیل مشخص نشده است.' });

    const pdfBuffer = await renderToBuffer(renderTaxInvoicePdf, invoice, order, venue);
    const provider = await getEmailProvider();
    await provider.sendEmail({
      to: email,
      subject: `فاکتور رسمی مالیاتی — ${invoice.serialNumber}`,
      html: `<p>فاکتور رسمی مالیاتی سفارش شما پیوست شده است.</p>`,
      attachments: [{ filename: `tax-invoice-${invoice.serialNumber}.pdf`, content: pdfBuffer }],
    });
    res.json({ sent: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listForVenue, generateForOrder, downloadForOrder, emailForOrder };
