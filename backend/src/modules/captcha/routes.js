const express = require('express');
const controller = require('./controller');

const router = express.Router();

// Public — the site key is not secret; the client needs it to render the widget.
router.get('/config', controller.getConfig);

module.exports = router;
