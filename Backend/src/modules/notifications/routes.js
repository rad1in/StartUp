const express = require('express');
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', controller.markRead);
router.get('/preferences', controller.getPreferences);
router.patch('/preferences', controller.setPreference);

module.exports = router;
