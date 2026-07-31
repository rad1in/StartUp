const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById } = require('../../lib/sqlHelpers');
const { encrypt, decrypt } = require('../../lib/ticketCrypto');
const { ticketAttachmentUrlFor } = require('../../lib/upload');
const { ADMIN_TEAM_ROLES } = require('../../middleware/platformPermission');
const { createNotification } = require('../notifications/service');
const { emitToCustomer, emitToAdmins } = require('../../sockets');

const DEPARTMENTS = ['MANAGEMENT', 'SALES', 'TECHNICAL'];

function isStaff(user) {
  return ADMIN_TEAM_ROLES.includes(user.role);
}

async function requireAccess(user, ticketId) {
  const ticket = await findById('SupportTicket', ticketId);
  if (!ticket) {
    const err = new Error('تیکت مورد نظر یافت نشد.');
    err.status = 404;
    throw err;
  }
  if (ticket.userId !== user.id && !isStaff(user)) {
    const err = new Error('دسترسی به این تیکت مجاز نیست.');
    err.status = 403;
    throw err;
  }
  return ticket;
}

async function attachThread(tickets) {
  if (tickets.length === 0) return [];
  const ids = tickets.map((t) => t.id);
  const [messages] = await pool.query(
    `SELECT m.*, u.name AS senderName, u.role AS senderRole
     FROM \`SupportTicketMessage\` m LEFT JOIN \`User\` u ON u.id = m.senderId
     WHERE m.ticketId IN (${ids.map(() => '?').join(',')}) ORDER BY m.createdAt ASC`,
    ids
  );
  const [attachments] = await pool.query(
    `SELECT * FROM \`SupportTicketAttachment\` WHERE messageId IN (${
      messages.length ? messages.map(() => '?').join(',') : 'NULL'
    })`,
    messages.map((m) => m.id)
  );

  const attachmentsByMessage = attachments.reduce((acc, a) => {
    (acc[a.messageId] = acc[a.messageId] || []).push(a);
    return acc;
  }, {});

  const messagesByTicket = messages.reduce((acc, m) => {
    const body = m.isConfidential && m.body ? decrypt(m.body) : m.body;
    (acc[m.ticketId] = acc[m.ticketId] || []).push({
      ...m,
      body,
      attachments: attachmentsByMessage[m.id] || [],
    });
    return acc;
  }, {});

  return tickets.map((t) => ({ ...t, messages: messagesByTicket[t.id] || [] }));
}

async function addMessage(ticketId, senderId, { body, isConfidential }, files) {
  const id = randomUUID();
  const storedBody = isConfidential && body ? encrypt(body) : body || null;
  await pool.query(
    'INSERT INTO `SupportTicketMessage` (id, ticketId, senderId, body, isConfidential) VALUES (?, ?, ?, ?, ?)',
    [id, ticketId, senderId, storedBody, !!isConfidential]
  );

  if (files?.length) {
    for (const file of files) {
      await pool.query(
        'INSERT INTO `SupportTicketAttachment` (id, messageId, fileUrl, fileName, mimeType) VALUES (?, ?, ?, ?, ?)',
        [randomUUID(), id, ticketAttachmentUrlFor(file.filename), file.originalname, file.mimetype]
      );
    }
  }

  await pool.query('UPDATE `SupportTicket` SET updatedAt = NOW() WHERE id = ?', [ticketId]);
  return id;
}

async function createTicket(userId, { subject, department, message, isConfidential }, files) {
  if (!subject || !message) {
    const err = new Error('موضوع و متن پیام الزامی است.');
    err.status = 400;
    throw err;
  }
  const dept = DEPARTMENTS.includes(department) ? department : 'TECHNICAL';

  const id = randomUUID();
  await pool.query('INSERT INTO `SupportTicket` (id, userId, department, subject) VALUES (?, ?, ?, ?)', [
    id,
    userId,
    dept,
    subject,
  ]);
  await addMessage(id, userId, { body: message, isConfidential }, files);

  emitToAdmins('support:update', { ticketId: id });

  return findById('SupportTicket', id);
}

async function replyToTicket(user, ticketId, { body, isConfidential }, files) {
  const ticket = await requireAccess(user, ticketId);
  if (!body && !files?.length) {
    const err = new Error('متن پیام یا فایل ضمیمه الزامی است.');
    err.status = 400;
    throw err;
  }
  await addMessage(ticketId, user.id, { body, isConfidential }, files);

  // Notify the other side — staff replying pings the customer, customer
  // replying pings whoever is watching this department's tickets.
  if (isStaff(user)) {
    await createNotification(
      ticket.userId,
      'SYSTEM',
      'پاسخ جدید به تیکت شما',
      `به تیکت «${ticket.subject}» پاسخ داده شد.`,
      { ticketId }
    );
  }

  // Live-updates both sides' open thread instantly (no polling/refresh
  // needed) — whichever side didn't just send this message.
  emitToCustomer(ticket.userId, 'support:update', { ticketId });
  emitToAdmins('support:update', { ticketId });

  return findById('SupportTicket', ticketId);
}

async function listMyTickets(userId) {
  const [rows] = await pool.query('SELECT * FROM `SupportTicket` WHERE userId = ? ORDER BY updatedAt DESC', [
    userId,
  ]);
  return rows;
}

async function listAllTickets({ department, status } = {}) {
  const conditions = [];
  const params = [];
  if (department) {
    conditions.push('t.department = ?');
    params.push(department);
  }
  if (status) {
    conditions.push('t.status = ?');
    params.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT t.*, u.name AS customerName FROM \`SupportTicket\` t
     LEFT JOIN \`User\` u ON u.id = t.userId
     ${where} ORDER BY t.updatedAt DESC`,
    params
  );
  return rows;
}

async function getTicket(user, ticketId) {
  const ticket = await requireAccess(user, ticketId);
  const [withThread] = await attachThread([ticket]);
  return withThread;
}

async function setStatus(user, ticketId, status) {
  await requireAccess(user, ticketId);
  if (!['OPEN', 'RESOLVED'].includes(status)) {
    const err = new Error('وضعیت نامعتبر است.');
    err.status = 400;
    throw err;
  }
  await pool.query('UPDATE `SupportTicket` SET status = ? WHERE id = ?', [status, ticketId]);
  return findById('SupportTicket', ticketId);
}

module.exports = {
  DEPARTMENTS,
  createTicket,
  replyToTicket,
  listMyTickets,
  listAllTickets,
  getTicket,
  setStatus,
};
