const service = require('./service');
const { postImageUrlFor } = require('../../lib/upload');

async function explore(req, res, next) {
  try {
    res.json(await service.listExplore({ page: req.query.page, viewerId: req.user?.id }));
  } catch (err) {
    next(err);
  }
}

async function getPost(req, res, next) {
  try {
    res.json(await service.getPost(req.params.id, req.user?.id));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('عکس پست الزامی است.');
      err.status = 400;
      throw err;
    }
    const imageUrl = postImageUrlFor(req.file.filename);
    res.status(201).json(await service.createPost(req.user.id, { imageUrl, caption: req.body.caption }));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deletePost(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function like(req, res, next) {
  try {
    res.json(await service.toggleLike(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
}

async function myPosts(req, res, next) {
  try {
    res.json(await service.listMyPosts(req.user.id, { page: req.query.page }));
  } catch (err) {
    next(err);
  }
}

async function publicProfile(req, res, next) {
  try {
    res.json(await service.getPublicProfile(req.params.username));
  } catch (err) {
    next(err);
  }
}

async function userPosts(req, res, next) {
  try {
    res.json(await service.listUserPosts(req.params.username, { page: req.query.page, viewerId: req.user?.id }));
  } catch (err) {
    next(err);
  }
}

module.exports = { explore, getPost, create, remove, like, myPosts, publicProfile, userPosts };
