// Showcase seed: ~22 extra demo cafes across Tehran so the discovery pages
// (filters, map, neighborhoods, ratings) feel like a real, busy platform.
// Idempotent: venues use fixed ids and are skipped if they already exist.
// Run with: node src/db/seedShowcase.js
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../lib/db');
const { placeholderCoverUrl } = require('./placeholderImage');

const MENU_TEMPLATES = [
  {
    categories: [
      {
        name: 'نوشیدنی گرم',
        items: [
          ['اسپرسو', 'تک‌شات عربیکا', 60000],
          ['آمریکانو', 'اسپرسو با آب گرم', 70000],
          ['کاپوچینو', 'با فوم شیر نرم', 88000],
          ['موکا', 'قهوه و شکلات بلژیکی', 105000],
        ],
      },
      {
        name: 'نوشیدنی سرد',
        items: [
          ['آیس‌آمریکانو', 'خنک و تلخ', 85000],
          ['آیس‌لاته کارامل', 'با سس کارامل خانگی', 110000],
        ],
      },
    ],
  },
  {
    categories: [
      {
        name: 'چای و دمنوش',
        items: [
          ['چای ماسالا', 'ادویه هندی و شیر', 75000],
          ['دمنوش به و دارچین', 'دمنوش فصل', 68000],
          ['چای سبز یاسمین', 'برگ کامل', 72000],
        ],
      },
      {
        name: 'شیرینی',
        items: [
          ['کیک هویج', 'با فراستینگ پنیری', 98000],
          ['چیزکیک توت‌فرنگی', 'دسر روز', 125000],
          ['کوکی شکلات', 'گرم سرو می‌شود', 65000],
        ],
      },
    ],
  },
  {
    categories: [
      {
        name: 'صبحانه',
        items: [
          ['املت سنتی', 'با نان تازه', 130000],
          ['پنکیک عسل', 'سه لایه با کره', 145000],
          ['بشقاب صبحانه کامل', 'پنیر، گردو، مربا و نان', 185000],
        ],
      },
      {
        name: 'نوشیدنی',
        items: [
          ['لاته', 'شیر و اسپرسو', 92000],
          ['آب‌پرتقال تازه', 'فشرده روز', 95000],
        ],
      },
    ],
  },
  {
    categories: [
      {
        name: 'غذای اصلی',
        items: [
          ['پاستا آلفردو', 'سس خامه و قارچ', 245000],
          ['برگر ذغالی', 'گوشت تازه با سیب‌زمینی', 265000],
          ['سالاد سزار', 'با مرغ گریل', 195000],
        ],
      },
      {
        name: 'نوشیدنی',
        items: [
          ['لیموناد نعنا', 'خنک و تازه', 85000],
          ['موهیتو', 'بدون الکل', 98000],
        ],
      },
    ],
  },
];

const REVIEW_POOL = [
  [5, 'همه‌چیز عالی بود، حتماً دوباره میام.'],
  [5, 'قهوه‌هاش واقعاً حرفه‌ایه، پرسنل هم خیلی مودب بودن.'],
  [4, 'فضاش دنج و آرومه، فقط کمی دیر سرو شد.'],
  [4, 'کیفیت خوب، قیمت منصفانه.'],
  [5, 'دیزاین داخلیش فوق‌العاده‌ست، عکس‌های خوبی گرفتم!'],
  [3, 'متوسط بود، انتظار بیشتری داشتم.'],
  [5, 'دسرهاش بی‌نظیره، مخصوصاً چیزکیک!'],
  [4, 'وای‌فای سریع، جای خوبی برای کار کردنه.'],
];

const CAFES = [
  ['کافه لمیز', 'قهوه تخصصی با برشته‌کاری روزانه در قلب تجریش.', 'تجریش', 'تهران، میدان تجریش، کوچه گلاب', ['قهوه تخصصی', 'دنج'], 'photo-1495474472287-4d71bcdd2085', 35.805, 51.433, 0],
  ['کافه هزارتو', 'راهروهای پر از گل و نور طبیعی، پاتوق عکاس‌ها.', 'سعادت‌آباد', 'تهران، سعادت‌آباد، میدان کاج', ['دیزاین مدرن', 'فضای باز'], 'photo-1447933601403-0c6688de566e', 35.782, 51.375, 1],
  ['کافه ونک ۲۴', 'باز تا پاسی از شب؛ مناسب جلسه‌های کاری دیروقت.', 'ونک', 'تهران، میدان ونک، برج آسمان', ['مناسب کار', 'نوشیدنی سرد'], 'photo-1442512595331-e89e73853f31', 35.757, 51.41, 0],
  ['کافه باغ نیاوران', 'زیر سایه چنارهای کهنسال، صبحانه در باغ.', 'نیاوران', 'تهران، نیاوران، جنب کاخ', ['فضای باز', 'صبحانه'], 'photo-1453614512568-c4024d13c247', 35.812, 51.47, 2],
  ['کافه پاساژ', 'دکور صنعتی و موسیقی وینیل در پاسداران.', 'پاسداران', 'تهران، پاسداران، بوستان دوم', ['دکور کلاسیک', 'موسیقی زنده'], 'photo-1521017432531-fbd92d768814', 35.775, 51.457, 0],
  ['کافه شمرون', 'چای ذغالی و قلیان‌های سنتی با حال‌وهوای قدیم.', 'فرمانیه', 'تهران، فرمانیه، کوچه یاس', ['چای تخصصی', 'دنج'], 'photo-1559925393-8be0ec4767c8', 35.803, 51.462, 1],
  ['کافه قیطریه پارک', 'رو به پارک قیطریه؛ برانچ‌های آخر هفته‌اش معروف است.', 'قیطریه', 'تهران، قیطریه، ضلع جنوبی پارک', ['صبحانه', 'فضای باز'], 'photo-1445116572660-236099ec97a0', 35.79, 51.443, 2],
  ['کافه کریم‌خان', 'کتاب و قهوه در ساختمانی به سبک دهه چهل.', 'کریم‌خان', 'تهران، کریم‌خان، خیابان سنایی', ['کتاب‌محور', 'دکور کلاسیک'], 'photo-1466978913421-dad2ebd01d17', 35.72, 51.42, 1],
  ['کافه هفت', 'پاتوق طراح‌ها و فریلنسرها با میزهای کار اختصاصی.', 'هفت‌تیر', 'تهران، هفت‌تیر، خیابان مفتح', ['مناسب کار', 'دیزاین مدرن'], 'photo-1504753793650-d4a2b783c15e', 35.715, 51.425, 0],
  ['کافه یوسف‌آباد', 'شیرینی خانگی مادربزرگ و چای تازه‌دم.', 'یوسف‌آباد', 'تهران، یوسف‌آباد، خیابان اسدآبادی', ['شیرینی خانگی', 'دنج'], 'photo-1525610553991-2bede1a236e2', 35.733, 51.406, 1],
  ['کافه امیر', 'برگرهای ذغالی و سیب‌زمینی‌های معروفش را از دست ندهید.', 'امیرآباد', 'تهران، امیرآباد، خیابان کارگر شمالی', ['فست‌فود', 'نوشیدنی سرد'], 'photo-1493857671505-72967e2e2760', 35.728, 51.392, 3],
  ['کافه ستاره', 'روف‌گاردن کوچک با ویو غروب ستارخان.', 'ستارخان', 'تهران، ستارخان، برق آلستوم', ['روف‌تاپ', 'فضای باز'], 'photo-1498804103079-a6351b050096', 35.72, 51.36, 0],
  ['کافه گیشا', 'پاتوق دانشجوها؛ قهوه ارزان و بی‌پایان.', 'گیشا', 'تهران، گیشا، کوی نصر', ['مناسب کار', 'قهوه تخصصی'], 'photo-1511920170033-f8396924c348', 35.74, 51.375, 0],
  ['کافه دربند', 'اول مسیر کوه؛ صبحانه کوهنوردی و چای آتشی.', 'دربند', 'تهران، دربند، اول مسیر پیاده‌روی', ['فضای باز', 'صبحانه'], 'photo-1512568400610-62da28bc8a13', 35.818, 51.42, 2],
  ['کافه الهیه', 'لاکچری و آرام؛ دسرهای فرانسوی و قهوه تک‌خاستگاه.', 'الهیه', 'تهران، الهیه، خیابان فرشته', ['قهوه تخصصی', 'دیزاین مدرن'], 'photo-1481833761820-0509d3217039', 35.795, 51.43, 1],
  ['کافه زعفرانیه', 'برانچ‌های مفصل و باغچه شیشه‌ای زمستانی.', 'زعفرانیه', 'تهران، زعفرانیه، خیابان مقدس اردبیلی', ['صبحانه', 'فضای باز'], 'photo-1534040385115-33dcb3acba5b', 35.807, 51.415, 2],
  ['کافه میرداماد', 'جلسه‌های کاری با اتاق‌های نیمه‌خصوصی.', 'میرداماد', 'تهران، میرداماد، میدان مادر', ['مناسب کار', 'دنج'], 'photo-1522992319-0365e5f11656', 35.76, 51.435, 0],
  ['کافه شهرک', 'بازی‌های رومیزی و شب‌های مافیا.', 'شهرک غرب', 'تهران، شهرک غرب، بلوار دادمان', ['بازی رومیزی', 'نوشیدنی سرد'], 'photo-1543007630-9710e4a00a20', 35.76, 51.365, 3],
  ['کافه درکه', 'کلبه چوبی کنار رودخانه با چای زغالی.', 'درکه', 'تهران، درکه، میانه مسیر', ['فضای باز', 'چای تخصصی'], 'photo-1554679665-f5537f187268', 35.815, 51.38, 1],
  ['کافه وگان سبز', 'اولین منوی کاملاً گیاهی محله؛ شیرهای گیاهی متنوع.', 'جردن', 'تهران، جردن، خیابان گلفام', ['وگان‌فرندلی', 'دیزاین مدرن'], 'photo-1506372023823-741c83b836fe', 35.77, 51.42, 1],
  ['کافه پت‌شاپ', 'با حیوان خانگی‌ات بیا؛ منوی مخصوص پت‌ها!', 'ولیعصر', 'تهران، ولیعصر، بالاتر از پارک‌وی', ['پت‌فرندلی', 'فضای باز'], 'photo-1497935586351-b67a49e012bf', 35.79, 51.41, 0],
  ['کافه سینما', 'دیوارهای پر از پوستر فیلم و نمایش‌های هفتگی.', 'انقلاب', 'تهران، انقلاب، خیابان بهار', ['دکور کلاسیک', 'موسیقی زنده'], 'photo-1461023058943-07fcbe16d735', 35.7, 51.395, 3],
];

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const [[customer]] = await pool.query("SELECT id FROM `User` WHERE email = 'customer@demo.local'");
  if (!customer) throw new Error('ابتدا seed اصلی را اجرا کنید (customer@demo.local یافت نشد).');

  let created = 0;
  for (let i = 0; i < CAFES.length; i++) {
    const [name, description, neighborhood, address, tags, photoId, lat, lng, templateIdx] = CAFES[i];
    const venueId = `showcase-venue-${String(i + 1).padStart(2, '0')}`;

    const [[existing]] = await pool.query('SELECT id FROM `Venue` WHERE id = ?', [venueId]);
    if (existing) continue;

    // Dedicated owner per cafe so BranchSwitcher doesn't treat them as branches
    // of one giant chain.
    const ownerEmail = `owner${i + 1}@showcase.local`;
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

    const coverImageUrl = placeholderCoverUrl(name);
    await pool.query(
      `INSERT INTO \`Venue\` (id, ownerId, name, description, address, city, neighborhood, cuisineType, tags, coverImageUrl, lat, lng, subscriptionTier, commissionRate, status)
       VALUES (?, ?, ?, ?, ?, 'تهران', ?, 'کافه', ?, ?, ?, ?, 'FREE', 10.0, 'ACTIVE')`,
      [venueId, ownerId, name, description, address, neighborhood, JSON.stringify(tags), coverImageUrl, lat, lng]
    );
    await pool.query('UPDATE `User` SET venueId = ? WHERE id = ?', [venueId, ownerId]);

    // Menu from the template
    const template = MENU_TEMPLATES[templateIdx];
    let firstItemId = null;
    let firstItemPrice = 0;
    for (let c = 0; c < template.categories.length; c++) {
      const category = template.categories[c];
      const categoryId = randomUUID();
      await pool.query('INSERT INTO `Category` (id, venueId, name, sortOrder) VALUES (?, ?, ?, ?)', [
        categoryId, venueId, category.name, c + 1,
      ]);
      for (const [itemName, itemDesc, price] of category.items) {
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
    }

    // A few tables with QR tokens
    for (let t = 1; t <= 3; t++) {
      await pool.query('INSERT INTO `VenueTable` (id, venueId, tableNumber, qrToken) VALUES (?, ?, ?, ?)', [
        randomUUID(), venueId, String(t), `showcase-qr-${i + 1}-${t}`,
      ]);
    }

    // One served order + 2-3 reviews from the rotating pool
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
    const reviewCount = 2 + (i % 2);
    for (let r = 0; r < reviewCount; r++) {
      const [rating, comment] = REVIEW_POOL[(i + r) % REVIEW_POOL.length];
      await pool.query(
        'INSERT INTO `Review` (id, userId, venueId, orderId, rating, comment) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), customer.id, venueId, orderId, rating, comment]
      );
    }

    created++;
  }

  console.log(`کافه‌های نمونه ایجاد شد: ${created} کافه جدید (${CAFES.length - created} از قبل موجود بود).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
