const express = require('express');
const controller = require('./controller');
const { authenticate, optionalAuthenticate } = require('../../middleware/auth');
const { postImageUpload, postImageOptimize } = require('../../lib/upload');

const router = express.Router();

// Browsing (explore feed, a single post, a public profile grid) works
// logged-out too — optionalAuthenticate just means isLikedByMe comes back
// false for guests instead of the request being rejected.
router.get('/posts', optionalAuthenticate, controller.explore);
router.get('/posts/:id', optionalAuthenticate, controller.getPost);
router.get('/profile/:username', controller.publicProfile);
router.get('/profile/:username/posts', optionalAuthenticate, controller.userPosts);

router.use(authenticate);
router.get('/me/posts', controller.myPosts);
router.post('/posts', postImageUpload.single('image'), postImageOptimize, controller.create);
router.delete('/posts/:id', controller.remove);
router.post('/posts/:id/like', controller.like);

module.exports = router;
