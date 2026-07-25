// Multi-city demo seed: cafes in مشهد، اصفهان، شیراز، کرج، تبریز، رشت so the
// header city picker actually changes what discovery pages show.
// Idempotent — fixed venue ids, skipped when already present.
// Run with: node src/db/seedMultiCity.js
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../lib/db');

const MENU = [
  ['اسپرسو', 'تک‌شات عربیکا', 60000],
  ['کاپوچینو', 'با فوم شیر نرم', 88000],
  ['لاته', 'شیر و اسپرسو', 92000],
  ['چای ماسالا', 'ادویه هندی و شیر', 75000],
  ['کیک روز', 'کیک خانگی تازه', 98000],
];

const REVIEWS = [
  [5, 'همه‌چیز عالی بود، حتماً دوباره میام.'],
  [4, 'کیفیت خوب، قیمت منصفانه.'],
  [5, 'فضای دلنشینی داره، پیشنهاد می‌کنم.'],
  [4, 'قهوه‌هاش خوب بود، کمی شلوغ بود.'],
];

// [name, city, neighborhood, address, tags, unsplash photo id, lat, lng]
const CAFES = [
  ['کافه ارگ', 'مشهد', 'احمدآباد', 'مشهد، بلوار احمدآباد، نبش عارف', ['قهوه تخصصی', 'دنج'], 'photo-1495474472287-4d71bcdd2085', 36.297, 59.598],
  ['کافه طرقبه', 'مشهد', 'طرقبه', 'مشهد، طرقبه، بلوار معلم', ['فضای باز', 'چای تخصصی'], 'photo-1512568400610-62da28bc8a13', 36.311, 59.376],
  ['کافه هفت‌حوض', 'مشهد', 'کوهسنگی', 'مشهد، کوهسنگی، پارک کوهسنگی', ['صبحانه', 'فضای باز'], 'photo-1445116572660-236099ec97a0', 36.276, 59.588],
  ['کافه چهارباغ', 'اصفهان', 'چهارباغ', 'اصفهان، چهارباغ عباسی', ['دکور کلاسیک', 'قهوه تخصصی'], 'photo-1521017432531-fbd92d768814', 32.649, 51.667],
  ['کافه جلفا', 'اصفهان', 'جلفا', 'اصفهان، محله جلفا، کوچه کلیسا', ['دنج', 'شیرینی خانگی'], 'photo-1525610553991-2bede1a236e2', 32.635, 51.655],
  ['کافه حافظیه', 'شیراز', 'حافظیه', 'شیراز، بلوار حافظ، جنب آرامگاه', ['فضای باز', 'چای تخصصی'], 'photo-1554679665-f5537f187268', 29.625, 52.558],
  ['کافه عفیف‌آباد', 'شیراز', 'عفیف‌آباد', 'شیراز، خیابان عفیف‌آباد', ['مناسب کار', 'دیزاین مدرن'], 'photo-1504753793650-d4a2b783c15e', 29.628, 52.503],
  ['کافه گوهردشت', 'کرج', 'گوهردشت', 'کرج، رجایی‌شهر، بلوار انقلاب', ['مناسب کار', 'نوشیدنی سرد'], 'photo-1442512595331-e89e73853f31', 35.821, 50.955],
  ['کافه عظیمیه', 'کرج', 'عظیمیه', 'کرج، عظیمیه، میدان مهران', ['صبحانه', 'دنج'], 'photo-1466978913421-dad2ebd01d17', 35.829, 51.01],
  ['کافه ائل‌گلی', 'تبریز', 'ائل‌گلی', 'تبریز، بلوار ائل‌گلی', ['فضای باز', 'دکور کلاسیک'], 'photo-1493857671505-72967e2e2760', 38.041, 46.352],
  ['کافه لاکان', 'رشت', 'گلسار', 'رشت، گلسار، خیابان ۹۲', ['صبحانه', 'شیرینی خانگی'], 'photo-1481833761820-0509d3217039', 37.297, 49.585],
];

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const [[customer]] = await pool.query("SELECT id FROM `User` WHERE email = 'customer@demo.local'");
  if (!customer) throw new Error('ابتدا seed اصلی را اجرا کنید (customer@demo.local یافت نشد).');

  let created = 0;
  for (let i = 0; i < CAFES.length; i++) {
    const [name, city, neighborhood, address, tags, photoId, lat, lng] = CAFES[i];
    const venueId = `multicity-venue-${String(i + 1).padStart(2, '0')}`;

    const [[existing]] = await pool.query('SELECT id FROM `Venue` WHERE id = ?', [venueId]);
    if (existing) continue;

    const ownerEmail = `cityowner${i + 1}@showcase.local`;
    let ownerId;
    const [[existingOwner]] = await pool.query('SELECT id FROM `User` WHERE email = ?', [ownerEmail]);
    if (existingOwner) {
      ownerId = existingOwner.id;
    } else {
      ownerId = randomUUID();
      await pool.query(
        "INSERT INTO `User` (id, email, name, passwordHash, role, venueId) VALUES (?, ?, ?, ?, 'VENUE_OWNER', NULL)",
        [ownerId, ownerEmail, `مالک ${name}`, passwordHash]
      );
    }

    await pool.query(
      `INSERT INTO \`Venue\` (id, ownerId, name, description, address, city, neighborhood, cuisineType, tags, coverImageUrl, lat, lng, subscriptionTier, commissionRate, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'کافه', ?, ?, ?, ?, 'FREE', 10.0, 'ACTIVE')`,
      [
        venueId,
        ownerId,
        name,
        `پاتوق دوست‌داشتنی ${neighborhood} — قهوه خوب و حال‌وهوای ${city}.`,
        address,
        city,
        neighborhood,
        JSON.stringify(tags),
        `https://images.unsplash.com/${photoId}?w=600&h=400&fit=crop`,
        lat,
        lng,
      ]
    );
    await pool.query('UPDATE `User` SET venueId = ? WHERE id = ?', [venueId, ownerId]);

    const categoryId = randomUUID();
    await pool.query("INSERT INTO `Category` (id, venueId, name, sortOrder) VALUES (?, ?, 'منوی کافه', 1)", [
      categoryId, venueId,
    ]);
    let firstItemId = null;
    let firstItemPrice = 0;
    for (const [itemName, itemDesc, price] of MENU) {
      const itemId = randomUUID();
      await pool.query(
        'INSERT INTO `MenuItem` (id, venueId, categoryId, name, description, price, isAvailable) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
        [itemId, venueId, categoryId, itemName, itemDesc, price]
      );
      if (!firstItemId) {
        firstItemId = itemId;
        firstItemPrice = price;
      }
    }

    for (let t = 1; t <= 3; t++) {
      await pool.query('INSERT INTO `VenueTable` (id, venueId, tableNumber, qrToken) VALUES (?, ?, ?, ?)', [
        randomUUID(), venueId, String(t), `multicity-qr-${i + 1}-${t}`,
      ]);
    }

    const orderId = randomUUID();
    await pool.query(
      `INSERT INTO \`Order\` (id, venueId, customerId, status, paymentStatus, totalAmount, commissionAmount)
       VALUES (?, ?, ?, 'SERVED', 'SUCCESS', ?, ?)`,
      [orderId, venueId, customer.id, firstItemPrice, Math.round(firstItemPrice * 0.1)]
    );
    await pool.query(
      'INSERT INTO `OrderItem` (id, orderId, menuItemId, quantity, unitPrice, subtotal) VALUES (?, ?, ?, 1, ?, ?)',
      [randomUUID(), orderId, firstItemId, firstItemPrice, firstItemPrice]
    );
    for (let r = 0; r < 2; r++) {
      const [rating, comment] = REVIEWS[(i + r) % REVIEWS.length];
      await pool.query(
        'INSERT INTO `Review` (id, userId, venueId, orderId, rating, comment) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), customer.id, venueId, orderId, rating, comment]
      );
    }

    created++;
  }

  console.log(`کافه‌های چندشهری ایجاد شد: ${created} کافه جدید در مشهد، اصفهان، شیراز، کرج، تبریز و رشت.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
