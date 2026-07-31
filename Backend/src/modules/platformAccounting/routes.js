'use strict';
const { Router } = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const c = require('./controller');

const router = Router();
const financeOnly = [authenticate, requireRole(['SUPER_ADMIN', 'FINANCE_STAFF'])];
const adminOnly   = [authenticate, requireRole(['SUPER_ADMIN'])];

router.get('/commission',                    ...financeOnly, c.commissionSummary);
router.get('/venue/:venueId',                ...financeOnly, c.venueContribution);
router.get('/pnl',                           ...financeOnly, c.getPnL);
router.get('/pnl/yearly',                    ...financeOnly, c.getYearlyPnL);
router.get('/pnl/export',                    ...financeOnly, c.exportPnL);
router.get('/costs',                         ...financeOnly, c.listCosts);
router.post('/costs',                        ...adminOnly,   c.addCost);
router.patch('/costs/:costId',               ...adminOnly,   c.updateCost);
router.delete('/costs/:costId',              ...adminOnly,   c.deleteCost);

module.exports = router;
