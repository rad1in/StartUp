const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { getPaymentProviderByName, getPaymentProviderForVerification } = require('../../payments');

async function getOrCreateWallet(userId) {
  const [rows] = await pool.query('SELECT * FROM `Wallet` WHERE userId = ?', [userId]);
  if (rows[0]) return rows[0];
  const id = randomUUID();
  await pool.query('INSERT INTO `Wallet` (id, userId, balance) VALUES (?, ?, 0)', [id, userId]);
  const [created] = await pool.query('SELECT * FROM `Wallet` WHERE id = ?', [id]);
  return created[0];
}

async function getBalance(userId) {
  const wallet = await getOrCreateWallet(userId);
  return { balance: Number(wallet.balance), walletId: wallet.id };
}

async function listTransactions(userId, { limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    'SELECT * FROM `WalletTransaction` WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
    [userId, limit, offset]
  );
  return rows;
}

async function initiateTopUp(userId, amount, providerName) {
  if (!amount || amount <= 0) {
    const err = new Error('مبلغ شارژ باید بزرگ‌تر از صفر باشد.');
    err.status = 400;
    throw err;
  }

  const { provider, providerName: resolvedProviderName } = await getPaymentProviderByName(providerName);
  const fakeOrder = { totalAmount: amount, id: `wallet-topup-${userId}` };
  const result = await provider.createPayment(fakeOrder);

  const txId = randomUUID();
  const wallet = await getOrCreateWallet(userId);

  if (result.status === 'SUCCESS') {
    // Mock provider succeeds immediately — credit right away
    const newBalance = Number(wallet.balance) + Number(amount);
    await pool.query('UPDATE `Wallet` SET balance = ? WHERE userId = ?', [newBalance, userId]);
    await pool.query(
      `INSERT INTO \`WalletTransaction\` (id, userId, type, amount, balanceAfter, status, providerRef, provider, description)
       VALUES (?, ?, 'TOPUP', ?, ?, 'SUCCESS', ?, ?, ?)`,
      [txId, userId, amount, newBalance, result.providerRef, resolvedProviderName, 'شارژ کیف پول']
    );
    return { success: true, balance: newBalance, providerRef: result.providerRef };
  }

  // For async providers: create PENDING transaction, return redirectUrl
  await pool.query(
    `INSERT INTO \`WalletTransaction\` (id, userId, type, amount, balanceAfter, status, providerRef, provider, description)
     VALUES (?, ?, 'TOPUP', ?, ?, 'PENDING', ?, ?, ?)`,
    [txId, userId, amount, Number(wallet.balance), result.providerRef, resolvedProviderName, 'شارژ کیف پول']
  );
  return { success: false, redirectUrl: result.redirectUrl, providerRef: result.providerRef };
}

async function confirmTopUp(providerRef) {
  const [txRows] = await pool.query(
    "SELECT * FROM `WalletTransaction` WHERE providerRef = ? AND type = 'TOPUP' AND status = 'PENDING'",
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
    await pool.query("UPDATE `WalletTransaction` SET status = 'FAILED' WHERE id = ?", [tx.id]);
    const err = new Error('تایید پرداخت ناموفق بود.');
    err.status = 400;
    throw err;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[wallet]] = await connection.query('SELECT * FROM `Wallet` WHERE userId = ? FOR UPDATE', [tx.userId]);
    const newBalance = Number(wallet.balance) + Number(tx.amount);
    await connection.query('UPDATE `Wallet` SET balance = ? WHERE userId = ?', [newBalance, tx.userId]);
    await connection.query(
      "UPDATE `WalletTransaction` SET status = 'SUCCESS', balanceAfter = ? WHERE id = ?",
      [newBalance, tx.id]
    );
    await connection.commit();
    return { balance: newBalance };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// Called inside an existing DB connection transaction.
async function spendFromWallet(connection, userId, amount, orderId, description = 'پرداخت از کیف پول') {
  const [[wallet]] = await connection.query('SELECT * FROM `Wallet` WHERE userId = ? FOR UPDATE', [userId]);
  if (!wallet || Number(wallet.balance) < amount) {
    const err = new Error('موجودی کیف پول کافی نیست.');
    err.status = 400;
    throw err;
  }
  const newBalance = Number(wallet.balance) - Number(amount);
  await connection.query('UPDATE `Wallet` SET balance = ? WHERE userId = ?', [newBalance, userId]);
  await connection.query(
    `INSERT INTO \`WalletTransaction\` (id, userId, type, amount, balanceAfter, status, orderId, description)
     VALUES (?, ?, 'SPEND', ?, ?, 'SUCCESS', ?, ?)`,
    [randomUUID(), userId, amount, newBalance, orderId, description]
  );
  return newBalance;
}

async function refundToWallet(userId, amount, orderId) {
  const wallet = await getOrCreateWallet(userId);
  const newBalance = Number(wallet.balance) + Number(amount);
  await pool.query('UPDATE `Wallet` SET balance = ? WHERE userId = ?', [newBalance, userId]);
  await pool.query(
    `INSERT INTO \`WalletTransaction\` (id, userId, type, amount, balanceAfter, status, orderId, description)
     VALUES (?, ?, 'REFUND', ?, ?, 'SUCCESS', ?, ?)`,
    [randomUUID(), userId, amount, newBalance, orderId, 'استرداد به کیف پول']
  );
}

async function adjustBalance(userId, amount, description) {
  const wallet = await getOrCreateWallet(userId);
  const newBalance = Math.max(0, Number(wallet.balance) + Number(amount));
  await pool.query('UPDATE `Wallet` SET balance = ? WHERE userId = ?', [newBalance, userId]);
  await pool.query(
    `INSERT INTO \`WalletTransaction\` (id, userId, type, amount, balanceAfter, status, description)
     VALUES (?, ?, 'ADJUSTMENT', ?, ?, 'SUCCESS', ?)`,
    [randomUUID(), userId, Math.abs(amount), newBalance, description || 'تنظیم دستی موجودی']
  );
  return newBalance;
}

module.exports = { getBalance, listTransactions, initiateTopUp, confirmTopUp, spendFromWallet, refundToWallet, adjustBalance, getOrCreateWallet };
