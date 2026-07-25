const express = require('express');
const controller = require('./controller');
const { optionalAuthenticate } = require('../../middleware/auth');

const router = express.Router();

// Group ordering is opt-in and guest-friendly (matches today's guest
// checkout) — no `authenticate` requirement anywhere here. optionalAuthenticate
// just lets a logged-in customer be recognized (skips the guestName prompt,
// and gets their userId attached to the resulting Order at checkout).
router.post('/', optionalAuthenticate, controller.create);
router.post('/:id/join', optionalAuthenticate, controller.join);
router.get('/:id', controller.get);
router.get('/:id/qrcode.png', controller.inviteQrCode);
router.post('/:id/items', controller.addItem);
router.delete('/:id/items/:itemId', controller.removeItem);
router.post('/:id/checkout', optionalAuthenticate, controller.checkout);

module.exports = router;
