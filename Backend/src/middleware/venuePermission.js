const { pool } = require('../lib/db');

// Fixed permission-key catalogue. Owners implicitly have all of these; staff
// only get what's explicitly granted via StaffPermission.
const PERMISSION_KEYS = [
  'orders.view',
  'orders.manage',
  'tables.view',
  'menu.manage',
  'accounting.view',
  'staff.manage',
  'settings.manage',
  'marketing.manage',
  'feedback.manage',
];

const STAFF_DEFAULT_PERMISSIONS = ['orders.view', 'orders.manage', 'tables.view'];

function requireVenuePermission(permission) {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'VENUE_OWNER') {
        return next();
      }
      if (req.user.role !== 'VENUE_STAFF') {
        return res.status(403).json({
          message:
            'دسترسی به این بخش برای شما مجاز نیست: حساب کارمندی شما این مجوز خاص را ندارد. از مالک یا مدیر این مجموعه بخواهید دسترسی لازم را در بخش «کارمندان» برایتان فعال کند.',
        });
      }

      const [rows] = await pool.query(
        'SELECT granted FROM `StaffPermission` WHERE userId = ? AND permission = ?',
        [req.user.id, permission]
      );
      if (!rows[0]?.granted) {
        return res.status(403).json({
          message:
            'دسترسی به این بخش برای شما مجاز نیست: حساب کارمندی شما این مجوز خاص را ندارد. از مالک یا مدیر این مجموعه بخواهید دسترسی لازم را در بخش «کارمندان» برایتان فعال کند.',
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireVenuePermission, PERMISSION_KEYS, STAFF_DEFAULT_PERMISSIONS };
