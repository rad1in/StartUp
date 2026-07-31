'use strict';
const { Router } = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const c = require('./controller');

const router = Router();
const adminOnly = [authenticate, requireRole(['SUPER_ADMIN'])];
const ownerOnly = [authenticate, requireRole(['VENUE_OWNER'])];

// Public
router.get('/', c.listPlans);

// Admin plan management — static routes MUST come before /:tier param route
router.get('/trial-settings', ...adminOnly, c.getTrialSettings);
router.patch('/trial-settings', ...adminOnly, c.updateTrialSettings);
router.patch('/:tier', ...adminOnly, c.updatePlan);

// Venue owner trial
router.post('/venue/:venueId/trial', ...ownerOnly, c.startTrial);
router.get('/venue/:venueId/trial', authenticate, c.getTrialStatus);

module.exports = router;
