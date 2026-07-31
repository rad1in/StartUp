const service = require('./service');
const { recordVenueView } = require('../favorites/service');
const { logActivity, listActivity } = require('../../lib/activityLog');
const { venueImageUrlFor } = require('../../lib/upload');
const { renderTableQrPng } = require('../../lib/qrcode');
const { emitToAdmins } = require('../../sockets');
const { notifyAdmins } = require('../adminNotifications/service');
const { isManagementContext } = require('../../lib/autoTranslate');

const ADMIN_TEAM_ROLES = ['SUPER_ADMIN', 'SUPPORT_STAFF', 'FINANCE_STAFF'];

async function list(req, res, next) {
  try {
    res.json(await service.listVenues({ lang: req.query.lang }));
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const lang = isManagementContext(req, req.params.id) ? undefined : req.query.lang;
    const venue = await service.getVenue(req.params.id, lang);
    if (req.user?.role === 'CUSTOMER') {
      recordVenueView(req.user.id, req.params.id).catch((err) => console.error('recordVenueView failed', err));
    }
    res.json(venue);
  } catch (err) {
    next(err);
  }
}

async function nearby(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = req.query.radius ? parseFloat(req.query.radius) : 100;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: 'مختصات جغرافیایی معتبر ارسال کنید.' });
    }
    res.json(await service.findNearby(lat, lng, radius));
  } catch (err) {
    next(err);
  }
}

async function resolveQr(req, res, next) {
  try {
    res.json(await service.resolveQrToken(req.params.token));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const isAdminTeam = ADMIN_TEAM_ROLES.includes(req.user.role);
    const ownerId = isAdminTeam && req.body.ownerId ? req.body.ownerId : req.user.id;
    const status = isAdminTeam ? 'ACTIVE' : 'PENDING';
    const venue = await service.createVenue({ ...req.body, ownerId, status });
    emitToAdmins('venue:registered', venue);
    res.status(201).json(venue);
  } catch (err) {
    next(err);
  }
}

async function registerMyVenue(req, res, next) {
  try {
    const venue = await service.registerOwnVenue(req.user.id, req.body);
    emitToAdmins('venue:registered', venue);
    notifyAdmins({
      type: 'VENUE_PENDING',
      title: `کافه جدید در انتظار تایید: ${venue.name}`,
      body: 'برای بررسی و تصمیم‌گیری به بخش مجموعه‌ها مراجعه کنید.',
      severity: 'INFO',
      link: `/admin/venues/${venue.id}`,
    }).catch(() => {});
    res.status(201).json(venue);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const venue = await service.updateVenue(req.params.id, req.body);
    await logActivity(req.params.id, req.user.id, 'VENUE_SETTINGS_UPDATED', 'Venue', req.params.id, req.body);
    res.json(venue);
  } catch (err) {
    next(err);
  }
}

async function setTemporaryClosure(req, res, next) {
  try {
    const { isTemporarilyClosed, reason } = req.body;
    const venue = await service.setTemporaryClosure(req.params.id, Boolean(isTemporarilyClosed), reason || null);
    await logActivity(req.params.id, req.user.id, 'VENUE_TEMPORARY_CLOSURE', 'Venue', req.params.id, {
      isTemporarilyClosed: Boolean(isTemporarilyClosed),
      reason,
    });
    res.json(venue);
  } catch (err) {
    next(err);
  }
}

async function uploadLogo(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'فایل تصویری ارسال نشده است.' });
    const venue = await service.setImage(req.params.id, 'logoUrl', venueImageUrlFor(req.file.filename));
    res.json(venue);
  } catch (err) {
    next(err);
  }
}

async function uploadCover(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'فایل تصویری ارسال نشده است.' });
    const venue = await service.setImage(req.params.id, 'coverImageUrl', venueImageUrlFor(req.file.filename));
    res.json(venue);
  } catch (err) {
    next(err);
  }
}

async function listTables(req, res, next) {
  try {
    res.json(await service.listTables(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function createTable(req, res, next) {
  try {
    const table = await service.createTable(req.params.id, req.body.tableNumber);
    await logActivity(req.params.id, req.user.id, 'TABLE_CREATED', 'VenueTable', table.id, null);
    res.status(201).json(table);
  } catch (err) {
    next(err);
  }
}

async function updateTable(req, res, next) {
  try {
    const table = await service.updateTable(req.params.tableId, req.body.tableNumber);
    await logActivity(req.params.id, req.user.id, 'TABLE_UPDATED', 'VenueTable', req.params.tableId, req.body);
    res.json(table);
  } catch (err) {
    next(err);
  }
}

async function deleteTable(req, res, next) {
  try {
    await service.deleteTable(req.params.tableId);
    await logActivity(req.params.id, req.user.id, 'TABLE_DELETED', 'VenueTable', req.params.tableId, null);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function resolveTableByNumber(req, res, next) {
  try {
    const { id: venueId, tableNumber } = req.params;
    const [[table]] = await require('../../lib/db').pool.query(
      'SELECT id, tableNumber FROM `VenueTable` WHERE venueId = ? AND tableNumber = ? LIMIT 1',
      [venueId, tableNumber]
    );
    if (!table) return res.status(404).json({ message: 'میز با این شماره پیدا نشد.' });
    res.json({ tableId: table.id, tableNumber: table.tableNumber });
  } catch (err) {
    next(err);
  }
}

async function tableQrCode(req, res, next) {
  try {
    const buffer = await renderTableQrPng(req.params.id, req.params.tableId);
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

async function requestSubscriptionChange(req, res, next) {
  try {
    const { requestedTier } = req.body;
    if (!['FREE', 'PRO', 'ULTRA'].includes(requestedTier)) {
      return res.status(400).json({ message: 'پلن درخواستی نامعتبر است.' });
    }
    const request = await service.createSubscriptionRequest(req.params.id, requestedTier);
    await logActivity(req.params.id, req.user.id, 'SUBSCRIPTION_CHANGE_REQUESTED', 'Venue', req.params.id, {
      requestedTier,
    });
    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
}

async function listSubscriptionRequests(req, res, next) {
  try {
    res.json(await service.listSubscriptionRequests(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function activityLog(req, res, next) {
  try {
    res.json(await listActivity({ venueId: req.params.id }));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  get,
  nearby,
  resolveQr,
  create,
  registerMyVenue,
  update,
  setTemporaryClosure,
  uploadLogo,
  uploadCover,
  listTables,
  createTable,
  updateTable,
  deleteTable,
  resolveTableByNumber,
  tableQrCode,
  requestSubscriptionChange,
  listSubscriptionRequests,
  activityLog,
};
