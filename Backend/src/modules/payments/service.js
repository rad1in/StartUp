const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById } = require('../../lib/sqlHelpers');
const { getPaymentProviderByName, getPaymentProviderForVerification, listEnabledPaymentMethods } = require('../../payments');
const { emitToVenue, emitToCustomer } = require('../../sockets');
const { earnPointsForOrder } = require('../loyalty/service');
const { getEmailProvider } = require('../../email');
const { generateForOrder: generateTaxInvoiceForOrder } = require('../taxInvoices/service');

// Best-effort order-confirmation email — never allowed to fail the payment
// flow itself, so every call site wraps this in .catch(() => {}).
async function sendOrderConfirmationEmail(order) {
  if (!order.customerId) return;
  const [[customer]] = await pool.query('SELECT email, emailMarketingOptOut FROM `User` WHERE id = ?', [order.customerId]);
  // Order confirmations are transactional, not marketing — sent regardless
  // of the marketing opt-out flag. Only skip if there's simply no email.
  if (!customer?.email) return;
  const venue = await findById('Venue', order.venueId);
  const provider = await getEmailProvider();
  await provider.sendEmail({
    to: customer.email,
    subject: `تایید سفارش شما در ${venue?.name || 'ET-Cafe'}`,
    html: `<p>سفارش شما با موفقیت ثبت و پرداخت شد.</p><p>مبلغ: ${Number(order.totalAmount).toLocaleString('fa-IR')} تومان</p><p>کد سفارش: ${order.id.slice(0, 8)}</p>`,
  });
}

// Runs everything that should happen once, right after an order's payment
// actually succeeds: confirmation email + (if the venue has an economic
// code configured) an official tax invoice. Needs the full order with its
// line items (which findById('Order', ...) alone doesn't include), so it
// re-fetches via orders/service.getOrder. Best-effort — a failure here must
// never surface as a failed payment.
async function handlePostPaymentSuccess(orderId) {
  const { getOrder } = require('../orders/service');
  const fullOrder = await getOrder(orderId);
  await sendOrderConfirmationEmail(fullOrder).catch(() => {});
  await generateTaxInvoiceForOrder(fullOrder).catch(() => {});
}

async function checkout(orderId, shareId, walletAmount = 0, providerName) {
  const order = await findById('Order', orderId);
  if (!order) {
    const err = new Error('سفارش یافت نشد.');
    err.status = 404;
    throw err;
  }

  let payAmount;
  let share = null;

  if (shareId) {
    const [shareRows] = await pool.query('SELECT * FROM `BillShare` WHERE id = ?', [shareId]);
    share = shareRows[0];
    if (!share || share.orderId !== orderId) {
      const err = new Error('سهم پرداخت یافت نشد.');
      err.status = 404;
      throw err;
    }
    if (share.paymentStatus === 'SUCCESS') {
      const err = new Error('این سهم قبلاً پرداخت شده است.');
      err.status = 400;
      throw err;
    }
    payAmount = Number(share.amount);
    walletAmount = 0; // wallet deduction only supported for full order payments
  } else {
    payAmount = Number(order.totalAmount);
  }

  // Clamp wallet amount to payAmount
  const effectiveWallet = Math.min(Math.max(Number(walletAmount), 0), payAmount);
  const gatewayAmount = payAmount - effectiveWallet;

  const connection = await pool.getConnection();
  let paymentId;
  let paymentStatus = 'PENDING';

  try {
    await connection.beginTransaction();

    // Deduct from wallet if requested
    if (effectiveWallet > 0 && order.customerId) {
      const { spendFromWallet } = require('../wallet/service');
      await spendFromWallet(connection, order.customerId, effectiveWallet, orderId);
      await connection.query('UPDATE `Order` SET walletAmountUsed = ? WHERE id = ?', [effectiveWallet, orderId]);
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
  connection.release();

  // Pay remaining amount via gateway (if any)
  if (gatewayAmount > 0) {
    const fakeOrder = { ...order, totalAmount: gatewayAmount };
    const { provider, providerName: resolvedProviderName } = await getPaymentProviderByName(providerName);
    const result = await provider.createPayment(fakeOrder);
    paymentStatus = result.status;

    paymentId = randomUUID();
    await pool.query(
      'INSERT INTO `Payment` (id, orderId, provider, providerRef, status, amount) VALUES (?, ?, ?, ?, ?, ?)',
      [paymentId, orderId, resolvedProviderName, result.providerRef, result.status, gatewayAmount]
    );

    if (shareId) {
      if (result.status === 'SUCCESS') {
        const { markSharePaid } = require('../billShares/service');
        await markSharePaid(shareId);
      } else {
        await pool.query("UPDATE `BillShare` SET paymentStatus = ? WHERE id = ?", [result.status, shareId]);
      }
    } else {
      await pool.query('UPDATE `Order` SET paymentStatus = ? WHERE id = ?', [result.status, orderId]);
    }

    if (result.redirectUrl) {
      const updatedOrder = await findById('Order', orderId);
      return { payment: await findById('Payment', paymentId), redirectUrl: result.redirectUrl, order: updatedOrder };
    }
  } else {
    // Fully paid by wallet
    paymentStatus = 'SUCCESS';
    if (shareId) {
      const { markSharePaid } = require('../billShares/service');
      await markSharePaid(shareId);
    } else {
      await pool.query("UPDATE `Order` SET paymentStatus = 'SUCCESS' WHERE id = ?", [orderId]);
    }
  }

  const updatedOrder = await findById('Order', orderId);
  emitToVenue(order.venueId, 'order:updated', updatedOrder);
  emitToCustomer(order.customerId, 'order:updated', updatedOrder);

  if (paymentStatus === 'SUCCESS' && !shareId) {
    const venue = await findById('Venue', order.venueId);
    await earnPointsForOrder(updatedOrder, venue);
    if (order.customerId) {
      const { evaluateCustomer } = require('../gamification/service');
      await evaluateCustomer(order.customerId).catch(() => {});
      const { completeReferralIfEligible } = require('../referral/service');
      await completeReferralIfEligible(order.customerId).catch(() => {});
    }
    handlePostPaymentSuccess(orderId).catch(() => {});
  }

  return {
    payment: paymentId ? await findById('Payment', paymentId) : null,
    order: updatedOrder,
  };
}

async function verify(providerRef) {
  const [rows] = await pool.query('SELECT * FROM `Payment` WHERE providerRef = ?', [providerRef]);
  const payment = rows[0];
  if (!payment) {
    const err = new Error('پرداخت یافت نشد.');
    err.status = 404;
    throw err;
  }

  const orderBefore = await findById('Order', payment.orderId);
  const wasAlreadySuccess = orderBefore.paymentStatus === 'SUCCESS';

  const { provider } = await getPaymentProviderForVerification(payment.provider);
  const result = await provider.verifyPayment(providerRef, Number(payment.amount));

  await pool.query('UPDATE `Payment` SET status = ? WHERE id = ?', [result.status, payment.id]);
  await pool.query('UPDATE `Order` SET paymentStatus = ? WHERE id = ?', [result.status, payment.orderId]);

  const updatedPayment = await findById('Payment', payment.id);
  const order = await findById('Order', payment.orderId);

  emitToVenue(order.venueId, 'order:updated', order);
  emitToCustomer(order.customerId, 'order:updated', order);

  if (result.status === 'SUCCESS' && !wasAlreadySuccess) {
    const venue = await findById('Venue', order.venueId);
    await earnPointsForOrder(order, venue);
    if (order.customerId) {
      const { evaluateCustomer } = require('../gamification/service');
      await evaluateCustomer(order.customerId).catch(() => {});
      const { completeReferralIfEligible } = require('../referral/service');
      await completeReferralIfEligible(order.customerId).catch(() => {});
    }
    handlePostPaymentSuccess(order.id).catch(() => {});
  }

  return { payment: updatedPayment, order };
}

// Saman/SEP POSTs its result directly to our own callback URL (see
// SamanProvider) with State/RefNum/ResNum — NOT the token we stored as
// providerRef at checkout time (the bank never echoes that token back). We
// correlate via ResNum (which we set to our order id at checkout), swap the
// Payment's stored providerRef over to the real RefNum, then delegate to the
// same generic verify() used by every other provider so all the loyalty/
// referral/notification side effects stay in one place.
async function handleSamanCallback({ State, RefNum, ResNum }) {
  if (!ResNum) {
    const err = new Error('پاسخ نامعتبر از درگاه پرداخت.');
    err.status = 400;
    throw err;
  }

  const [rows] = await pool.query(
    "SELECT * FROM `Payment` WHERE orderId = ? AND provider = 'saman' AND status = 'PENDING' ORDER BY createdAt DESC LIMIT 1",
    [ResNum]
  );
  const payment = rows[0];
  if (!payment) {
    const err = new Error('تراکنش مرتبط یافت نشد.');
    err.status = 404;
    throw err;
  }

  if (State !== 'OK' || !RefNum) {
    await pool.query("UPDATE `Payment` SET status = 'FAILED' WHERE id = ?", [payment.id]);
    await pool.query("UPDATE `Order` SET paymentStatus = 'FAILED' WHERE id = ?", [ResNum]);
    return { orderId: ResNum, status: 'FAILED' };
  }

  await pool.query('UPDATE `Payment` SET providerRef = ? WHERE id = ?', [RefNum, payment.id]);
  const { order } = await verify(RefNum);
  return { orderId: order.id, status: order.paymentStatus };
}

// PayPing POSTs its result directly to our callback URL (see
// PaypingProvider/buildPaypingCallbackUrl) with clientRefId/paymentCode/
// paymentRefId/status — clientRefId is the order id we set at checkout.
// verifyPayment needs both paymentCode and paymentRefId, so we pack them
// into providerRef as "paymentCode:paymentRefId" before delegating to the
// shared generic verify(), same trick as Saman's token/RefNum split.
async function handlePaypingCallback({ clientRefId, paymentCode, paymentRefId, status }) {
  if (!clientRefId) {
    const err = new Error('پاسخ نامعتبر از درگاه پرداخت.');
    err.status = 400;
    throw err;
  }

  const [rows] = await pool.query(
    "SELECT * FROM `Payment` WHERE orderId = ? AND provider = 'payping' AND status = 'PENDING' ORDER BY createdAt DESC LIMIT 1",
    [clientRefId]
  );
  const payment = rows[0];
  if (!payment) {
    const err = new Error('تراکنش مرتبط یافت نشد.');
    err.status = 404;
    throw err;
  }

  if (String(status) !== '1' && String(status).toLowerCase() !== 'ok' || !paymentRefId) {
    await pool.query("UPDATE `Payment` SET status = 'FAILED' WHERE id = ?", [payment.id]);
    await pool.query("UPDATE `Order` SET paymentStatus = 'FAILED' WHERE id = ?", [clientRefId]);
    return { orderId: clientRefId, status: 'FAILED' };
  }

  const packedRef = `${paymentCode}:${paymentRefId}`;
  await pool.query('UPDATE `Payment` SET providerRef = ? WHERE id = ?', [packedRef, payment.id]);
  const { order } = await verify(packedRef);
  return { orderId: order.id, status: order.paymentStatus };
}

module.exports = { checkout, verify, handleSamanCallback, handlePaypingCallback, listEnabledPaymentMethods };
