const express = require('express');
const controller = require('./controller');

const router = express.Router();

// Public — the GA4 measurement ID is not secret; the client needs it to
// load gtag.js. Only served once the visitor has already given cookie
// consent (the frontend only calls this after consent, and even then the
// script itself is gated on the "enabled" flag being true).
router.get('/', controller.getConfig);

module.exports = router;
