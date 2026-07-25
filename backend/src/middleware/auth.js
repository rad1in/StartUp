const { verifyAccessToken } = require('../lib/jwt');
const { pool } = require('../lib/db');
const { logActivity } = require('../lib/activityLog');

// Every mutating request made on an impersonated session gets its own audit
// row — separate from the app's normal per-feature activity logging — so an
// admin can pull up "everything this admin did while impersonating owner X"
// without having to know which feature-specific log entries to look for.
function logImpersonatedAction(req) {
  if (req.method === 'GET') return;
  logActivity(req.user.venueId || null, req.user.impersonatedBy, 'IMPERSONATED_ACTION', 'REQUEST', null, {
    method: req.method,
    path: req.originalUrl,
    actingAsUserId: req.user.id,
  }).catch(() => {});
}

const SESSION_EXPIRED_MESSAGE =
  'برای انجام این کار باید وارد حساب کاربری خود باشید: نشست شما منقضی شده یا هنوز وارد نشده‌اید. لطفاً دوباره وارد حساب کاربری خود شوید.';

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: SESSION_EXPIRED_MESSAGE });
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, venueId: payload.venueId, impersonatedBy: payload.impersonatedBy || null };
    if (req.user.impersonatedBy) logImpersonatedAction(req);
    next();
  } catch (err) {
    return res.status(401).json({ message: SESSION_EXPIRED_MESSAGE });
  }
}

function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, venueId: payload.venueId };
  } catch (err) {
    // ignore invalid token for optional auth routes (e.g. guest checkout)
  }
  next();
}

function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: SESSION_EXPIRED_MESSAGE });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        message:
          'دسترسی به این بخش برای شما مجاز نیست: نوع حساب کاربری شما اجازه استفاده از این قسمت را نمی‌دهد. اگر فکر می‌کنید این اشتباه است، با پشتیبانی یا مدیر مجموعه خود تماس بگیرید.',
      });
    }
    next();
  };
}

// Async: checks Venue.ownerId for VENUE_OWNER (all their branches pass),
// and StaffVenueAccess for multi-branch staff beyond their primary venueId.
function requireVenueScope(paramName = 'venueId') {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'SUPER_ADMIN') return next();
      const targetVenueId = req.params[paramName] || req.body.venueId;
      if (!targetVenueId) {
        return res
          .status(400)
          .json({ message: 'شعبه مشخص نشده است: درخواست بدون شناسه مجموعه ارسال شده. لطفاً صفحه را رفرش کرده و دوباره تلاش کنید.' });
      }

      const venueAccessDenied = () =>
        res.status(403).json({
          message:
            'دسترسی به این مجموعه برای شما مجاز نیست: این شعبه متعلق به حساب کاربری شما نیست یا هنوز به شما اختصاص داده نشده. اگر فکر می‌کنید باید دسترسی داشته باشید، از مالک مجموعه بخواهید دسترسی شما را در بخش «کارمندان» فعال کند.',
        });

      if (req.user.role === 'VENUE_OWNER') {
        // Grant if they are the DB-level owner OR if this is their primary assigned venue
        if (req.user.venueId === targetVenueId) {
          req.activeVenueId = targetVenueId;
          return next();
        }
        const [[venue]] = await pool.query('SELECT ownerId FROM `Venue` WHERE id = ?', [targetVenueId]);
        if (!venue || venue.ownerId !== req.user.id) {
          return venueAccessDenied();
        }
        req.activeVenueId = targetVenueId;
        return next();
      }

      // VENUE_STAFF: primary assignment or explicit multi-branch grant
      if (req.user.venueId === targetVenueId) {
        req.activeVenueId = targetVenueId;
        return next();
      }
      const [[access]] = await pool.query(
        'SELECT 1 FROM `StaffVenueAccess` WHERE userId = ? AND venueId = ?',
        [req.user.id, targetVenueId]
      );
      if (!access) return venueAccessDenied();
      req.activeVenueId = targetVenueId;
      next();
    } catch (err) {
      next(err);
    }
  };
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'SUPPORT_STAFF', 'FINANCE_STAFF'];

function requirePlatformPermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: SESSION_EXPIRED_MESSAGE });
    if (permission === 'platform.admin' && !ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        message:
          'دسترسی به این بخش برای شما مجاز نیست: این قسمت فقط برای کارمندان پلتفرم قابل استفاده است. اگر فکر می‌کنید باید دسترسی داشته باشید، با مدیر ارشد پلتفرم تماس بگیرید.',
      });
    }
    next();
  };
}

module.exports = { authenticate, optionalAuthenticate, requireRole, requireVenueScope, requirePlatformPermission };
