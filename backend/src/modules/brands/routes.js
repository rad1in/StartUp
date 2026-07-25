const express = require('express');
const router = express.Router();
const c = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

const ownerGuard = [authenticate, requireRole(['VENUE_OWNER', 'SUPER_ADMIN'])];

router.get('/', ...ownerGuard, c.listBrands);
router.get('/available-venues', ...ownerGuard, c.listAvailableVenues);
router.post('/', ...ownerGuard, c.createBrand);
router.patch('/:brandId', ...ownerGuard, c.updateBrand);
router.delete('/:brandId', ...ownerGuard, c.deleteBrand);

router.post('/:brandId/venues', ...ownerGuard, c.addVenueToBrand);
router.delete('/:brandId/venues/:venueId', ...ownerGuard, c.removeVenueFromBrand);

router.get('/:brandId/report', ...ownerGuard, c.getBrandReport);
router.get('/:brandId/staff', ...ownerGuard, c.listStaff);
router.post('/:brandId/staff', ...ownerGuard, c.assignStaff);
router.delete('/:brandId/staff/:staffUserId/venues/:venueId', ...ownerGuard, c.removeStaff);

module.exports = router;
