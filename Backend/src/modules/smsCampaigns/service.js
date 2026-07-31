const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById } = require('../../lib/sqlHelpers');
const { getSmsProvider } = require('../../sms');
const { getEmailProvider } = require('../../email');
const { pricePerMessageForTier } = require('../../utils/smsPricing');
const { getPaymentProviderByName, getPaymentProviderForVerification } = require('../../payments');

async function getAudience(venueId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT u.phone FROM \`Order\` o
     JOIN \`User\` u ON u.id = o.customerId
     WHERE o.venueId = ? AND u.phone IS NOT NULL AND u.phone != '' AND u.smsMarketingOptOut = FALSE`,
    [venueId]
  );
  return rows.map((r) => r.phone);
}

// Same customer pool but their email — used by the "also send by email"
// option on a campaign (see approveCampaign).
async function getEmailAudience(venueId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT u.email FROM \`Order\` o
     JOIN \`User\` u ON u.id = o.customerId
     WHERE o.venueId = ? AND u.email IS NOT NULL AND u.email != '' AND u.emailMarketingOptOut = FALSE`,
    [venueId]
  );
  return rows.map((r) => r.email);
}

async function getCredit(venueId) {
  const venue = await findById('Venue', venueId);
  return { balance: Number(venue?.smsCredit || 0) };
}

async function listCampaigns(venueId) {
  const [rows] = await pool.query('SELECT * FROM `SmsCampaign` WHERE venueId = ? ORDER BY createdAt DESC', [venueId]);
  return rows;
}

async function createCampaign(venueId, { title, message, alsoSendEmail }) {
  if (!title || !message) {
    const err = new Error('عنوان و متن پیامک الزامی است.');
    err.status = 400;
    throw err;
  }
  if (message.length > 500) {
    const err = new Error('متن پیامک بیش از حد طولانی است (حداکثر ۵۰۰ کاراکتر).');
    err.status = 400;
    throw err;
  }

  const venue = await findById('Venue', venueId);
  const phones = await getAudience(venueId);
  const pricePerMessage = pricePerMessageForTier(venue.subscriptionTier);
  const totalCost = phones.length * pricePerMessage;

  const id = randomUUID();
  await pool.query(
    `INSERT INTO \`SmsCampaign\` (id, venueId, title, message, alsoSendEmail, recipientCount, pricePerMessage, totalCost, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
    [id, venueId, title, message, Boolean(alsoSendEmail), phones.length, pricePerMessage, totalCost]
  );
  return findById('SmsCampaign', id);
}

// --- Admin review ---

async function listForAdmin(status) {
  const [rows] = status
    ? await pool.query(
        'SELECT c.*, v.name AS venueName FROM `SmsCampaign` c JOIN `Venue` v ON v.id = c.venueId WHERE c.status = ? ORDER BY c.createdAt DESC',
        [status]
      )
    : await pool.query(
        'SELECT c.*, v.name AS venueName FROM `SmsCampaign` c JOIN `Venue` v ON v.id = c.venueId ORDER BY c.createdAt DESC LIMIT 200'
      );
  return rows;
}

async function approveCampaign(campaignId, adminId) {
  const campaign = await findById('SmsCampaign', campaignId);
  if (!campaign || campaign.status !== 'PENDING') {
    const err = new Error('کمپین یافت نشد یا قابل تایید نیست.');
    err.status = 404;
    throw err;
  }

  const venue = await findById('Venue', campaign.venueId);
  const cost = Number(campaign.totalCost);

  if (cost > 0 && Number(venue.smsCredit) < cost) {
    const err = new Error('اعتبار پیامکی کافه برای این کمپین کافی نیست.');
    err.status = 400;
    throw err;
  }

  let newBalance = Number(venue.smsCredit);
  if (cost > 0) {
    newBalance = Number(venue.smsCredit) - cost;
    await pool.query('UPDATE `Venue` SET smsCredit = ? WHERE id = ?', [newBalance, campaign.venueId]);
    await pool.query(
      `INSERT INTO \`SmsCreditTransaction\` (id, venueId, type, amount, balanceAfter, status, campaignId, description)
       VALUES (?, ?, 'SPEND', ?, ?, 'SUCCESS', ?, ?)`,
      [randomUUID(), campaign.venueId, cost, newBalance, campaign.id, `هزینه کمپین «${campaign.title}»`]
    );
  }

  await pool.query(
    "UPDATE `SmsCampaign` SET status = 'APPROVED', reviewedBy = ?, reviewedAt = NOW() WHERE id = ?",
    [adminId, campaignId]
  );

  try {
    const phones = await getAudience(campaign.venueId);
    const provider = await getSmsProvider();
    const result = await provider.sendBulk(phones, campaign.message);

    // Email is best-effort and doesn't affect the campaign's SMS status —
    // a failed email send never rolls back the (already-spent) SMS credit.
    let emailSentCount = null;
    if (campaign.alsoSendEmail) {
      try {
        const emails = await getEmailAudience(campaign.venueId);
        const emailProvider = await getEmailProvider();
        const venue = await findById('Venue', campaign.venueId);
        await Promise.all(
          emails.map((to) =>
            emailProvider
              .sendEmail({
                to,
                subject: campaign.title,
                html: `<p>${campaign.message.replace(/\n/g, '<br/>')}</p><p style="color:#999;font-size:12px;margin-top:16px;">ارسال شده از طرف ${venue?.name || 'ET-Cafe'}</p>`,
              })
              .catch(() => null)
          )
        );
        emailSentCount = emails.length;
      } catch {
        emailSentCount = 0;
      }
    }

    await pool.query(
      "UPDATE `SmsCampaign` SET status = 'SENT', sentCount = ?, emailSentCount = ?, sentAt = NOW() WHERE id = ?",
      [result.recIds?.length ?? phones.length, emailSentCount, campaignId]
    );
  } catch (err) {
    await pool.query("UPDATE `SmsCampaign` SET status = 'FAILED' WHERE id = ?", [campaignId]);
    if (cost > 0) {
      const refundedBalance = newBalance + cost;
      await pool.query('UPDATE `Venue` SET smsCredit = ? WHERE id = ?', [refundedBalance, campaign.venueId]);
      await pool.query(
        `INSERT INTO \`SmsCreditTransaction\` (id, venueId, type, amount, balanceAfter, status, campaignId, description)
         VALUES (?, ?, 'REFUND', ?, ?, 'SUCCESS', ?, ?)`,
        [randomUUID(), campaign.venueId, cost, refundedBalance, campaign.id, `استرداد به دلیل خطای ارسال کمپین «${campaign.title}»`]
      );
    }
  }

  return findById('SmsCampaign', campaignId);
}

async function rejectCampaign(campaignId, adminId, reason) {
  const campaign = await findById('SmsCampaign', campaignId);
  if (!campaign || campaign.status !== 'PENDING') {
    const err = new Error('کمپین یافت نشد یا قابل رد کردن نیست.');
    err.status = 404;
    throw err;
  }
  await pool.query(
    "UPDATE `SmsCampaign` SET status = 'REJECTED', reviewedBy = ?, reviewedAt = NOW(), rejectionReason = ? WHERE id = ?",
    [adminId, reason || null, campaignId]
  );
  return findById('SmsCampaign', campaignId);
}

// --- SMS credit top-up (mirrors wallet/service.js's top-up flow, but scoped
// to a venue's smsCredit balance instead of a customer's wallet balance) ---

async function initiateCreditTopUp(venueId, amount, providerName) {
  if (!amount || amount <= 0) {
    const err = new Error('مبلغ شارژ باید بزرگ‌تر از صفر باشد.');
    err.status = 400;
    throw err;
  }

  const { provider, providerName: resolvedProviderName } = await getPaymentProviderByName(providerName);
  const fakeOrder = { totalAmount: amount, id: `sms-credit-${venueId}` };
  const result = await provider.createPayment(fakeOrder);

  const txId = randomUUID();
  const venue = await findById('Venue', venueId);

  if (result.status === 'SUCCESS') {
    const newBalance = Number(venue.smsCredit) + Number(amount);
    await pool.query('UPDATE `Venue` SET smsCredit = ? WHERE id = ?', [newBalance, venueId]);
    await pool.query(
      `INSERT INTO \`SmsCreditTransaction\` (id, venueId, type, amount, balanceAfter, status, providerRef, provider, description)
       VALUES (?, ?, 'TOPUP', ?, ?, 'SUCCESS', ?, ?, ?)`,
      [txId, venueId, amount, newBalance, result.providerRef, resolvedProviderName, 'شارژ اعتبار پیامکی']
    );
    return { success: true, balance: newBalance, providerRef: result.providerRef };
  }

  await pool.query(
    `INSERT INTO \`SmsCreditTransaction\` (id, venueId, type, amount, balanceAfter, status, providerRef, provider, description)
     VALUES (?, ?, 'TOPUP', ?, ?, 'PENDING', ?, ?, ?)`,
    [txId, venueId, amount, Number(venue.smsCredit), result.providerRef, resolvedProviderName, 'شارژ اعتبار پیامکی']
  );
  return { success: false, redirectUrl: result.redirectUrl, providerRef: result.providerRef };
}

async function confirmCreditTopUp(providerRef) {
  const [txRows] = await pool.query(
    "SELECT * FROM `SmsCreditTransaction` WHERE providerRef = ? AND type = 'TOPUP' AND status = 'PENDING'",
    [providerRef]
  );
  const tx = txRows[0];
  if (!tx) {
    const err = new Error('تراکنش شارژ یافت نشد.');
    err.status = 404;
    throw err;
  }

  const { provider } = await getPaymentProviderForVerification(tx.provider);
  const result = await provider.verifyPayment(providerRef, tx.amount);

  if (result.status !== 'SUCCESS') {
    await pool.query("UPDATE `SmsCreditTransaction` SET status = 'FAILED' WHERE id = ?", [tx.id]);
    const err = new Error('تایید پرداخت ناموفق بود.');
    err.status = 400;
    throw err;
  }

  const venue = await findById('Venue', tx.venueId);
  const newBalance = Number(venue.smsCredit) + Number(tx.amount);
  await pool.query('UPDATE `Venue` SET smsCredit = ? WHERE id = ?', [newBalance, tx.venueId]);
  await pool.query(
    "UPDATE `SmsCreditTransaction` SET status = 'SUCCESS', balanceAfter = ? WHERE id = ?",
    [newBalance, tx.id]
  );
  return { balance: newBalance };
}

async function listCreditTransactions(venueId) {
  const [rows] = await pool.query(
    'SELECT * FROM `SmsCreditTransaction` WHERE venueId = ? ORDER BY createdAt DESC LIMIT 100',
    [venueId]
  );
  return rows;
}

module.exports = {
  getCredit,
  listCampaigns,
  createCampaign,
  listForAdmin,
  approveCampaign,
  rejectCampaign,
  initiateCreditTopUp,
  confirmCreditTopUp,
  listCreditTransactions,
};
