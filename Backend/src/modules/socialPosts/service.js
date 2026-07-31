const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, deleteById } = require('../../lib/sqlHelpers');

const PAGE_SIZE = 20;

// Attaches `isLikedByMe` to a batch of posts in one query instead of N — the
// explore feed and a profile grid both render up to a page of 20 posts, so
// this keeps either at 2 queries total regardless of viewer/anonymous.
async function annotateLiked(posts, viewerId) {
  if (!viewerId || posts.length === 0) return posts.map((p) => ({ ...p, isLikedByMe: false }));
  const ids = posts.map((p) => p.id);
  const [likedRows] = await pool.query(
    `SELECT postId FROM \`PostLike\` WHERE userId = ? AND postId IN (${ids.map(() => '?').join(',')})`,
    [viewerId, ...ids]
  );
  const likedSet = new Set(likedRows.map((r) => r.postId));
  return posts.map((p) => ({ ...p, isLikedByMe: likedSet.has(p.id) }));
}

// Explore feed — every post on the platform, newest first. No follow graph
// exists (yet), so "explore" and "everyone's feed" are the same thing.
async function listExplore({ page = 1, viewerId } = {}) {
  const offset = (Math.max(1, Number(page) || 1) - 1) * PAGE_SIZE;
  const [posts] = await pool.query(
    `SELECT p.id, p.userId, p.imageUrl, p.caption, p.likeCount, p.createdAt,
            u.username, u.name AS userName, u.avatarUrl
     FROM \`Post\` p
     JOIN \`User\` u ON u.id = p.userId
     ORDER BY p.createdAt DESC, p.id DESC
     LIMIT ? OFFSET ?`,
    [PAGE_SIZE, offset]
  );
  return annotateLiked(posts, viewerId);
}

async function getPost(postId, viewerId) {
  const [rows] = await pool.query(
    `SELECT p.id, p.userId, p.imageUrl, p.caption, p.likeCount, p.createdAt,
            u.username, u.name AS userName, u.avatarUrl
     FROM \`Post\` p
     JOIN \`User\` u ON u.id = p.userId
     WHERE p.id = ?`,
    [postId]
  );
  if (!rows[0]) {
    const err = new Error('پست مورد نظر پیدا نشد.');
    err.status = 404;
    throw err;
  }
  const [annotated] = await annotateLiked(rows, viewerId);
  return annotated;
}

async function createPost(userId, { caption, imageUrl }) {
  if (!imageUrl) {
    const err = new Error('عکس پست الزامی است.');
    err.status = 400;
    throw err;
  }
  if (caption && caption.length > 2200) {
    const err = new Error('کپشن حداکثر ۲۲۰۰ کاراکتر می‌تواند باشد.');
    err.status = 400;
    throw err;
  }
  const id = randomUUID();
  await pool.query('INSERT INTO `Post` (id, userId, imageUrl, caption) VALUES (?, ?, ?, ?)', [
    id,
    userId,
    imageUrl,
    caption || null,
  ]);
  return getPost(id, userId);
}

async function deletePost(userId, postId) {
  const post = await findById('Post', postId);
  if (!post || post.userId !== userId) {
    const err = new Error('پست مورد نظر پیدا نشد.');
    err.status = 404;
    throw err;
  }
  return deleteById('Post', postId);
}

// Toggle rather than separate like/unlike endpoints — the mobile double-tap
// gesture only ever wants "make sure it's liked", so the controller decides
// which direction based on the current isLikedByMe it already has, and this
// stays a single idempotent operation either way.
async function toggleLike(userId, postId) {
  const post = await findById('Post', postId);
  if (!post) {
    const err = new Error('پست مورد نظر پیدا نشد.');
    err.status = 404;
    throw err;
  }

  const [existing] = await pool.query('SELECT 1 FROM `PostLike` WHERE postId = ? AND userId = ?', [postId, userId]);
  if (existing.length > 0) {
    await pool.query('DELETE FROM `PostLike` WHERE postId = ? AND userId = ?', [postId, userId]);
    await pool.query('UPDATE `Post` SET likeCount = GREATEST(0, likeCount - 1) WHERE id = ?', [postId]);
    const updated = await findById('Post', postId);
    return { isLikedByMe: false, likeCount: updated.likeCount };
  }

  await pool.query('INSERT IGNORE INTO `PostLike` (postId, userId) VALUES (?, ?)', [postId, userId]);
  await pool.query('UPDATE `Post` SET likeCount = likeCount + 1 WHERE id = ?', [postId]);
  const updated = await findById('Post', postId);
  return { isLikedByMe: true, likeCount: updated.likeCount };
}

async function getPublicProfile(username) {
  const [rows] = await pool.query(
    `SELECT id, username, name, bio, avatarUrl, coverImageUrl,
            (SELECT COUNT(*) FROM \`Post\` WHERE userId = u.id) AS postCount
     FROM \`User\` u WHERE username = ? AND isProfilePublic = TRUE AND deletedAt IS NULL`,
    [username]
  );
  if (!rows[0]) {
    const err = new Error('این پروفایل پیدا نشد یا عمومی نیست.');
    err.status = 404;
    throw err;
  }
  return rows[0];
}

async function listUserPosts(username, { page = 1, viewerId } = {}) {
  const profile = await getPublicProfile(username);
  const offset = (Math.max(1, Number(page) || 1) - 1) * PAGE_SIZE;
  const [posts] = await pool.query(
    `SELECT id, userId, imageUrl, caption, likeCount, createdAt
     FROM \`Post\` WHERE userId = ? ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?`,
    [profile.id, PAGE_SIZE, offset]
  );
  return annotateLiked(posts, viewerId);
}

// Unlike getPublicProfile/listUserPosts (used for viewing *someone else's*
// profile by @username, gated on isProfilePublic), a user can always see
// their own posts regardless of that flag — it only controls visibility to
// other people.
async function listMyPosts(userId, { page = 1 } = {}) {
  const offset = (Math.max(1, Number(page) || 1) - 1) * PAGE_SIZE;
  const [posts] = await pool.query(
    `SELECT id, userId, imageUrl, caption, likeCount, createdAt
     FROM \`Post\` WHERE userId = ? ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?`,
    [userId, PAGE_SIZE, offset]
  );
  return annotateLiked(posts, userId);
}

module.exports = {
  listExplore,
  getPost,
  createPost,
  deletePost,
  toggleLike,
  getPublicProfile,
  listUserPosts,
  listMyPosts,
  PAGE_SIZE,
};
