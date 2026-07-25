const { pool } = require('../lib/db');

// Fixed permission-key catalogue for internal platform team accounts.
// SUPER_ADMIN implicitly has all of these; SUPPORT_STAFF/FINANCE_STAFF only
// get what's explicitly granted via AdminPermission.
const PERMISSION_KEYS = [
  'venues.manage',
  'customers.manage',
  'billing.manage',
  'settings.manage',
  'reports.view',
  'security.manage',
  'staff.manage',
  'content.manage',
  'integrations.manage',
  'sms.manage',
];

const ROLE_DEFAULT_PERMISSIONS = {
  SUPPORT_STAFF: ['venues.manage', 'customers.manage'],
  FINANCE_STAFF: ['billing.manage', 'reports.view'],
};

const ADMIN_TEAM_ROLES = ['SUPER_ADMIN', 'SUPPORT_STAFF', 'FINANCE_STAFF'];

function requirePlatformPermission(permission) {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'SUPER_ADMIN') {
        return next();
      }
      if (!ADMIN_TEAM_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          message:
            'دسترسی به این بخش برای شما مجاز نیست: حساب کارمندی شما این مجوز خاص را ندارد. اگر برای انجام این کار به دسترسی نیاز دارید، از مدیر ارشد پلتفرم بخواهید آن را برایتان فعال کند.',
        });
      }

      const [rows] = await pool.query(
        'SELECT granted FROM `AdminPermission` WHERE userId = ? AND permission = ?',
        [req.user.id, permission]
      );
      if (!rows[0]?.granted) {
        return res.status(403).json({
          message:
            'دسترسی به این بخش برای شما مجاز نیست: حساب کارمندی شما این مجوز خاص را ندارد. اگر برای انجام این کار به دسترسی نیاز دارید، از مدیر ارشد پلتفرم بخواهید آن را برایتان فعال کند.',
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requirePlatformPermission, PERMISSION_KEYS, ROLE_DEFAULT_PERMISSIONS, ADMIN_TEAM_ROLES };
