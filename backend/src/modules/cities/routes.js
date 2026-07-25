const express = require('express');
const controller = require('./controller');

const router = express.Router();

// Public: provinces + cities for the city picker.
router.get('/', controller.list);

module.exports = router;
