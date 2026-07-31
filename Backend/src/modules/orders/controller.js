const service = require('./service');
const { renderReceiptPdf, renderToBuffer } = require('../../lib/pdf');
const { getSmsProvider } = require('../../sms');
const { getEmailProvider } = require('../../email');
const { pool } = require('../../lib/db');

async function create(req, res, next) {
  try {
    const { venueId, tableId, items, couponCode, redeemPoints, punchCardId, isPickup } = req.body;
    if (!venueId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'شناسه مجموعه و اقلام سفارش الزامی است.' });
    }
    const customerId = req.user?.role === 'CUSTOMER' ? req.user.id : null;
    const order = await service.createOrder({ venueId, tableId, customerId, items, couponCode, redeemPoints, punchCardId, isPickup });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

async function listForVenue(req, res, next) {
  try {
    const { status, tableId, from, to } = req.query;
    res.json(await service.listOrdersForVenue(req.params.venueId, { status, tableId, from, to }));
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const { venueId, status, from, to } = req.query;
    res.json(await service.listOrdersForCustomer(req.user.id, { venueId, status, from, to }));
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const order = await service.getOrder(req.params.id);

    // Prevent IDOR: only the order's own customer, its venue's staff/owner, or a
    // platform admin may read the full order (customer identity, items, totals).
    const isOwnerCustomer = req.user.role === 'CUSTOMER' && order.customerId === req.user.id;
    const isVenueStaff = ['VENUE_OWNER', 'VENUE_STAFF'].includes(req.user.role) && req.user.venueId === order.venueId;
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    if (!isOwnerCustomer && !isVenueStaff && !isSuperAdmin) {
      return res.status(403).json({ message: 'دسترسی به این سفارش مجاز نیست.' });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    res.json(await service.updateOrderStatus(req.params.id, status, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function updateItems(req, res, next) {
  try {
    res.json(await service.updateOrderItems(req.params.id, req.body.items, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function updateDiscount(req, res, next) {
  try {
    const { discountAmount, discountReason } = req.body;
    res.json(await service.updateOrderDiscount(req.params.id, discountAmount, discountReason, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function voidOrder(req, res, next) {
  try {
    res.json(await service.voidOrder(req.params.id, req.body.reason, req.user.id));
  } catch (err) {
    next(err);
  }
}

async function cancelOwnOrder(req, res, next) {
  try {
    res.json(await service.cancelOwnOrder(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
}

async function activity(req, res, next) {
  try {
    res.json(await service.getOrderActivity(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function reorder(req, res, next) {
  try {
    res.json(await service.getReorderPayload(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function receipt(req, res, next) {
  try {
    const order = await service.getOrder(req.params.id);

    const isOwnerCustomer = req.user.role === 'CUSTOMER' && order.customerId === req.user.id;
    const isVenueStaff = ['VENUE_OWNER', 'VENUE_STAFF'].includes(req.user.role) && req.user.venueId === order.venueId;
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    if (!isOwnerCustomer && !isVenueStaff && !isSuperAdmin) {
      return res.status(403).json({ message: 'دسترسی به این فاکتور مجاز نیست.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${order.id}.pdf"`);
    renderReceiptPdf(order, res);
  } catch (err) {
    next(err);
  }
}

async function sendReceiptSms(req, res, next) {
  try {
    const order = await service.getOrder(req.params.id);
    const isOwnerCustomer = req.user.role === 'CUSTOMER' && order.customerId === req.user.id;
    const isVenueStaff = ['VENUE_OWNER', 'VENUE_STAFF'].includes(req.user.role) && req.user.venueId === order.venueId;
    if (!isOwnerCustomer && !isVenueStaff && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'دسترسی به این فاکتور مجاز نیست.' });
    }

    let phone = req.body.phone;
    if (!phone && order.customerId) {
      const [[customer]] = await pool.query('SELECT phone FROM `User` WHERE id = ?', [order.customerId]);
      phone = customer?.phone;
    }
    if (!phone) return res.status(400).json({ message: 'شماره موبایل مشخص نشده است.' });

    const message = `فیش سفارش ET-Cafe\nمبلغ: ${Number(order.totalAmount).toLocaleString('fa-IR')} تومان\nوضعیت: ${order.status}\nکد سفارش: ${order.id.slice(0, 8)}`;
    const provider = await getSmsProvider();
    await provider.sendText(phone, message);
    res.json({ sent: true });
  } catch (err) {
    next(err);
  }
}

async function sendReceiptEmail(req, res, next) {
  try {
    const order = await service.getOrder(req.params.id);
    const isOwnerCustomer = req.user.role === 'CUSTOMER' && order.customerId === req.user.id;
    const isVenueStaff = ['VENUE_OWNER', 'VENUE_STAFF'].includes(req.user.role) && req.user.venueId === order.venueId;
    if (!isOwnerCustomer && !isVenueStaff && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'دسترسی به این فاکتور مجاز نیست.' });
    }

    let email = req.body.email;
    if (!email && order.customerId) {
      const [[customer]] = await pool.query('SELECT email FROM `User` WHERE id = ?', [order.customerId]);
      email = customer?.email;
    }
    if (!email) return res.status(400).json({ message: 'آدرس ایمیل مشخص نشده است.' });

    const pdfBuffer = await renderToBuffer(renderReceiptPdf, order);
    const provider = await getEmailProvider();
    await provider.sendEmail({
      to: email,
      subject: `فیش سفارش ET-Cafe — ${order.id.slice(0, 8)}`,
      html: `<p>فیش سفارش شما پیوست شده است.</p><p>مبلغ: ${Number(order.totalAmount).toLocaleString('fa-IR')} تومان</p><p>وضعیت: ${order.status}</p>`,
      attachments: [{ filename: `receipt-${order.id}.pdf`, content: pdfBuffer }],
    });
    res.json({ sent: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  listForVenue,
  listMine,
  sendReceiptSms,
  sendReceiptEmail,
  get,
  updateStatus,
  updateItems,
  updateDiscount,
  voidOrder,
  cancelOwnOrder,
  activity,
  reorder,
  receipt,
};
