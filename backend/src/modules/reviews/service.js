const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { findById, deleteById } = require('../../lib/sqlHelpers');
const { createNotification } = require('../notifications/service');

const LOW_RATING_THRESHOLD = 2;

async function createReview(userId, { orderId, venueId, menuItemId, rating, comment }) {
  if (!rating || rating < 1 || rating > 5) {
    const err = new Error('امتیاز باید بین ۱ تا ۵ باشد.');
    err.status = 400;
    throw err;
  }

  const order = await findById('Order', orderId);
  if (!order || order.customerId !== userId) {
    const err = new Error('سفارش مورد نظر یافت نشد.');
    err.status = 404;
    throw err;
  }
  if (order.status !== 'SERVED') {
    const err = new Error('فقط پس از سرو شدن سفارش می‌توانید نظر ثبت کنید.');
    err.status = 400;
    throw err;
  }

  const id = randomUUID();
  await pool.query(
    'INSERT INTO `Review` (id, userId, venueId, orderId, menuItemId, rating, comment) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, userId, venueId, orderId, menuItemId || null, rating, comment || null]
  );

  if (rating <= LOW_RATING_THRESHOLD) {
    const venue = await findById('Venue', venueId);
    if (venue) {
      await createNotification(
        venue.ownerId,
        'LOW_REVIEW',
        'یک نظر با امتیاز پایین ثبت شد',
        `مشتری امتیاز ${rating} از ۵ برای مجموعه شما ثبت کرد.`,
        { reviewId: id }
      );
    }
  }

  return findById('Review', id);
}

async function replyToReview(venueId, reviewId, reply) {
  const review = await findById('Review', reviewId);
  if (!review || review.venueId !== venueId) {
    const err = new Error('نظر مورد نظر یافت نشد.');
    err.status = 404;
    throw err;
  }
  await pool.query('UPDATE `Review` SET venueReply = ?, venueRepliedAt = NOW() WHERE id = ?', [reply, reviewId]);

  await createNotification(
    review.userId,
    'SYSTEM',
    'پاسخی به نظر شما ثبت شد',
    'مجموعه‌ای که برایش نظر ثبت کرده بودید به شما پاسخ داد.',
    { reviewId }
  );

  return findById('Review', reviewId);
}

async function sentimentTrend(venueId) {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(createdAt, '%Y-%m') AS month, AVG(rating) AS averageRating, COUNT(*) AS reviewCount
     FROM \`Review\` WHERE venueId = ? GROUP BY month ORDER BY month ASC`,
    [venueId]
  );
  return rows.map((row) => ({
    month: row.month,
    averageRating: Number(row.averageRating),
    reviewCount: Number(row.reviewCount),
  }));
}

async function updateReview(userId, id, { rating, comment }) {
  const review = await findById('Review', id);
  if (!review || review.userId !== userId) {
    const err = new Error('نظر مورد نظر یافت نشد.');
    err.status = 404;
    throw err;
  }
  await pool.query('UPDATE `Review` SET rating = ?, comment = ? WHERE id = ?', [
    rating ?? review.rating,
    comment !== undefined ? comment : review.comment,
    id,
  ]);
  return findById('Review', id);
}

async function deleteReview(userId, id) {
  const review = await findById('Review', id);
  if (!review || review.userId !== userId) {
    const err = new Error('نظر مورد نظر یافت نشد.');
    err.status = 404;
    throw err;
  }
  return deleteById('Review', id);
}

async function listMyReviews(userId) {
  const [reviews] = await pool.query(
    `SELECT r.*, v.name AS venueName, v.logoUrl AS venueLogoUrl, v.coverImageUrl AS venueCoverImageUrl,
            o.createdAt AS orderCreatedAt
     FROM \`Review\` r
     LEFT JOIN \`Venue\` v ON v.id = r.venueId
     LEFT JOIN \`Order\` o ON o.id = r.orderId
     WHERE r.userId = ? ORDER BY r.createdAt DESC`,
    [userId]
  );
  if (reviews.length === 0) return [];

  const orderIds = [...new Set(reviews.map((r) => r.orderId).filter(Boolean))];
  let itemsByOrderId = {};
  if (orderIds.length > 0) {
    const [items] = await pool.query(
      `SELECT oi.orderId, oi.quantity, mi.name AS menuItemName, c.name AS comboName
       FROM \`OrderItem\` oi
       LEFT JOIN \`MenuItem\` mi ON mi.id = oi.menuItemId
       LEFT JOIN \`Combo\` c ON c.id = oi.comboId
       WHERE oi.orderId IN (${orderIds.map(() => '?').join(',')})`,
      orderIds
    );
    itemsByOrderId = items.reduce((acc, item) => {
      (acc[item.orderId] = acc[item.orderId] || []).push({
        name: item.menuItemName || item.comboName,
        quantity: item.quantity,
      });
      return acc;
    }, {});
  }

  return reviews.map((r) => ({ ...r, orderItems: itemsByOrderId[r.orderId] || [] }));
}

async function listVenueReviews(venueId) {
  const [reviews] = await pool.query(
    'SELECT r.*, u.name AS userName FROM `Review` r LEFT JOIN `User` u ON u.id = r.userId WHERE r.venueId = ? ORDER BY r.createdAt DESC',
    [venueId]
  );
  const [[{ averageRating, reviewCount }]] = await pool.query(
    'SELECT COALESCE(AVG(rating), 0) AS averageRating, COUNT(*) AS reviewCount FROM `Review` WHERE venueId = ?',
    [venueId]
  );
  return { reviews, averageRating: Number(averageRating), reviewCount: Number(reviewCount) };
}

module.exports = {
  createReview,
  updateReview,
  deleteReview,
  listMyReviews,
  listVenueReviews,
  replyToReview,
  sentimentTrend,
};
