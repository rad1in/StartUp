const express = require('express');
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { requirePlatformPermission, ADMIN_TEAM_ROLES } = require('../../middleware/platformPermission');
const { ticketAttachmentUpload } = require('../../lib/upload');

const router = express.Router();

router.use(authenticate);

function requireStaff(req, res, next) {
  if (!ADMIN_TEAM_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: 'شما اجازه دسترسی به این بخش را ندارید.' });
  }
  next();
}

// Staff-only ticket queue (any signed-in role can still create/view their
// own tickets via the routes below).
router.get('/admin/tickets', requireStaff, requirePlatformPermission('customers.manage'), controller.listAllTickets);

router.post('/tickets', ticketAttachmentUpload.array('attachments', 3), controller.createTicket);
router.get('/tickets', controller.listMyTickets);
router.get('/tickets/:id', controller.getTicket);
router.post('/tickets/:id/messages', ticketAttachmentUpload.array('attachments', 3), controller.reply);
router.patch('/tickets/:id/status', controller.setStatus);

module.exports = router;
