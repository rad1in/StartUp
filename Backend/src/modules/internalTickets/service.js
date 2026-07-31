'use strict';
const { v4: uuid } = require('uuid');
const { pool } = require('../../lib/db');
const { notifyAdmins } = require('../adminNotifications/service');

// Keyword-based priority escalation — never downgrades a priority the caller
// explicitly chose, only bumps it up when the title/description contains
// language that signals urgency. A cheap, transparent stand-in for a real
// classifier: an admin can see exactly why a ticket got escalated.
const URGENCY_KEYWORDS = {
  CRITICAL: ['قطعی', 'داون', 'هک', 'نشت اطلاعات', 'security breach', 'down', 'outage', 'حمله'],
  HIGH: ['فوری', 'پرداخت', 'پول', 'مسدود شد', 'کار نمی‌کند', 'خطای بحرانی', 'urgent', 'payment failed'],
};
const PRIORITY_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

function escalateByKeywords(text, currentPriority) {
  const lower = (text || '').toLowerCase();
  for (const [level, keywords] of Object.entries(URGENCY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) {
      return PRIORITY_RANK[level] > PRIORITY_RANK[currentPriority] ? level : currentPriority;
    }
  }
  return currentPriority;
}

async function createTicket({ title, description, priority = 'MEDIUM', assignedTo, linkedEntityType, linkedEntityId, sourceTicketId, slaHours = 24, createdBy }) {
  priority = escalateByKeywords(`${title} ${description}`, priority);
  if (priority === 'CRITICAL') slaHours = Math.min(slaHours, 4);
  else if (priority === 'HIGH') slaHours = Math.min(slaHours, 12);
  const id = uuid();
  await pool.query(
    `INSERT INTO InternalTicket
       (id, title, description, priority, assignedTo, linkedEntityType, linkedEntityId, sourceTicketId, slaHours, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, title, description, priority, assignedTo || null, linkedEntityType || null, linkedEntityId || null, sourceTicketId || null, slaHours, createdBy]
  );
  if (['HIGH', 'CRITICAL'].includes(priority)) {
    notifyAdmins({
      type: 'TICKET_URGENT',
      title: `تیکت ${priority === 'CRITICAL' ? 'بحرانی' : 'با اولویت بالا'}: ${title}`,
      body: description?.slice(0, 200),
      severity: priority === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      link: '/admin/tickets',
    }).catch(() => {});
  }
  return { id };
}

async function listTickets({ status, priority, assignedTo, search, page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];

  if (status) { conditions.push('t.status = ?'); params.push(status); }
  if (priority) { conditions.push('t.priority = ?'); params.push(priority); }
  if (assignedTo) { conditions.push('t.assignedTo = ?'); params.push(assignedTo); }
  if (search) {
    conditions.push('(t.title LIKE ? OR t.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT
       t.*,
       creator.name  AS createdByName,
       assignee.name AS assignedToName,
       CASE
         WHEN t.status IN ('OPEN','IN_PROGRESS')
              AND DATE_ADD(t.createdAt, INTERVAL t.slaHours HOUR) < NOW()
         THEN 1 ELSE 0
       END AS isOverdue,
       (SELECT COUNT(*) FROM TicketComment tc WHERE tc.ticketId = t.id) AS commentCount
     FROM InternalTicket t
     LEFT JOIN \`User\` creator  ON t.createdBy   = creator.id
     LEFT JOIN \`User\` assignee ON t.assignedTo  = assignee.id
     ${where}
     ORDER BY
       FIELD(t.priority,'CRITICAL','HIGH','MEDIUM','LOW'),
       t.createdAt DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM InternalTicket t ${where}`,
    params
  );

  return { tickets: rows, total, page, limit };
}

async function getTicket(id) {
  const [[ticket]] = await pool.query(
    `SELECT
       t.*,
       creator.name  AS createdByName,
       assignee.name AS assignedToName,
       CASE
         WHEN t.status IN ('OPEN','IN_PROGRESS')
              AND DATE_ADD(t.createdAt, INTERVAL t.slaHours HOUR) < NOW()
         THEN 1 ELSE 0
       END AS isOverdue
     FROM InternalTicket t
     LEFT JOIN \`User\` creator  ON t.createdBy  = creator.id
     LEFT JOIN \`User\` assignee ON t.assignedTo = assignee.id
     WHERE t.id = ?`,
    [id]
  );
  if (!ticket) return null;

  const [comments] = await pool.query(
    `SELECT tc.*, u.name AS authorName, u.role AS authorRole
     FROM TicketComment tc
     JOIN \`User\` u ON tc.authorId = u.id
     WHERE tc.ticketId = ?
     ORDER BY tc.createdAt ASC`,
    [id]
  );
  return { ...ticket, comments };
}

async function updateTicket(id, { title, description, priority, status, assignedTo, slaHours }) {
  const fields = [];
  const params = [];
  if (title !== undefined)      { fields.push('title = ?');      params.push(title); }
  if (description !== undefined){ fields.push('description = ?'); params.push(description); }
  if (priority !== undefined)   { fields.push('priority = ?');   params.push(priority); }
  if (status !== undefined)     { fields.push('status = ?');     params.push(status); }
  if (assignedTo !== undefined) { fields.push('assignedTo = ?'); params.push(assignedTo || null); }
  if (slaHours !== undefined)   { fields.push('slaHours = ?');   params.push(slaHours); }
  if (!fields.length) return;
  params.push(id);
  await pool.query(`UPDATE InternalTicket SET ${fields.join(', ')} WHERE id = ?`, params);
}

async function addComment(ticketId, authorId, body) {
  const id = uuid();
  await pool.query(
    'INSERT INTO TicketComment (id, ticketId, authorId, body) VALUES (?, ?, ?, ?)',
    [id, ticketId, authorId, body]
  );
  // Auto-transition OPEN → IN_PROGRESS on first comment from assignee
  await pool.query(
    `UPDATE InternalTicket SET status = 'IN_PROGRESS'
     WHERE id = ? AND assignedTo = ? AND status = 'OPEN'`,
    [ticketId, authorId]
  );
  return { id };
}

async function escalateFromSupport(supportTicketId, createdBy) {
  const [[st]] = await pool.query(
    'SELECT * FROM SupportTicket WHERE id = ?',
    [supportTicketId]
  );
  if (!st) throw new Error('تیکت پشتیبانی یافت نشد.');
  return createTicket({
    title: `[Escalated] ${st.subject || st.title || 'Support Ticket'}`,
    description: st.message || st.description || '',
    priority: 'HIGH',
    linkedEntityType: st.userId ? 'CUSTOMER' : null,
    linkedEntityId: st.userId || null,
    sourceTicketId,
    createdBy,
  });
}

async function getOverdueSummary() {
  const [[row]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status IN ('OPEN','IN_PROGRESS') AND DATE_ADD(createdAt, INTERVAL slaHours HOUR) < NOW() THEN 1 ELSE 0 END) AS overdue,
       SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS open,
       SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS inProgress
     FROM InternalTicket`
  );
  return row;
}

module.exports = {
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
  addComment,
  escalateFromSupport,
  getOverdueSummary,
};
