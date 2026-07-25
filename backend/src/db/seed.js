const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../lib/db');

async function upsertUser({ email, name, passwordHash, role, venueId }) {
  const [existing] = await pool.query('SELECT id FROM `User` WHERE email = ?', [email]);
  if (existing.length > 0) {
    const id = existing[0].id;
    await pool.query('UPDATE `User` SET name = ?, role = ?, venueId = ? WHERE id = ?', [
      name,
      role,
      venueId || null,
      id,
    ]);
    return id;
  }
  const id = randomUUID();
  await pool.query(
    'INSERT INTO `User` (id, email, name, passwordHash, role, venueId) VALUES (?, ?, ?, ?, ?, ?)',
    [id, email, name, passwordHash, role, venueId || null]
  );
  return id;
}

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const superAdminId = await upsertUser({
    email: 'admin@platform.local',
    name: 'مدیر کل پلتفرم',
    passwordHash,
    role: 'SUPER_ADMIN',
  });

  const ownerId = await upsertUser({
    email: 'owner@demo-cafe.local',
    name: 'مالک کافه دمو',
    passwordHash,
    role: 'VENUE_OWNER',
  });

  const venueId = 'demo-venue-0001';
  const [existingVenue] = await pool.query('SELECT id FROM `Venue` WHERE id = ?', [venueId]);
  if (existingVenue.length === 0) {
    await pool.query(
      `INSERT INTO \`Venue\` (id, ownerId, name, description, address, city, neighborhood, tags, coverImageUrl, lat, lng, subscriptionTier, commissionRate, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [
        venueId,
        ownerId,
        'کافه روژ',
        'فضایی گرم و صمیمی با تراس رویایی، مناسب برای قرارهای دونفره و عصرهای پاییزی.',
        'تهران، خیابان ولیعصر، نرسیده به پارک',
        'تهران',
        'ولیعصر',
        JSON.stringify(['فضای باز', 'قهوه تخصصی']),
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=400&fit=crop',
        35.7219,
        51.3347,
        'FREE',
        10.0,
      ]
    );
  } else {
    await pool.query(
      `UPDATE \`Venue\` SET name = ?, description = ?, address = ?, neighborhood = ?, tags = ?, coverImageUrl = ?
       WHERE id = ?`,
      [
        'کافه روژ',
        'فضایی گرم و صمیمی با تراس رویایی، مناسب برای قرارهای دونفره و عصرهای پاییزی.',
        'تهران، خیابان ولیعصر، نرسیده به پارک',
        'ولیعصر',
        JSON.stringify(['فضای باز', 'قهوه تخصصی']),
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=400&fit=crop',
        venueId,
      ]
    );
  }

  await pool.query('UPDATE `User` SET venueId = ? WHERE id = ?', [venueId, ownerId]);

  const staffId = await upsertUser({
    email: 'staff@demo-cafe.local',
    name: 'باریستای دمو',
    passwordHash,
    role: 'VENUE_STAFF',
    venueId,
  });

  await upsertUser({
    email: 'customer@demo.local',
    name: 'مشتری نمونه',
    passwordHash,
    role: 'CUSTOMER',
  });

  const qrToken = 'demo-qr-token-0001';
  const [existingTable] = await pool.query('SELECT id FROM `VenueTable` WHERE qrToken = ?', [qrToken]);
  if (existingTable.length === 0) {
    await pool.query('INSERT INTO `VenueTable` (id, venueId, tableNumber, qrToken) VALUES (?, ?, ?, ?)', [
      randomUUID(),
      venueId,
      '1',
      qrToken,
    ]);
  }

  let [existingCategory] = await pool.query('SELECT id FROM `Category` WHERE venueId = ? LIMIT 1', [venueId]);
  let categoryId;
  if (existingCategory.length === 0) {
    categoryId = randomUUID();
    await pool.query('INSERT INTO `Category` (id, venueId, name, sortOrder) VALUES (?, ?, ?, ?)', [
      categoryId,
      venueId,
      'نوشیدنی‌های گرم',
      1,
    ]);
  } else {
    categoryId = existingCategory[0].id;
  }

  const [existingItems] = await pool.query('SELECT id FROM `MenuItem` WHERE venueId = ?', [venueId]);
  if (existingItems.length === 0) {
    const items = [
      ['اسپرسو', 'قهوه اسپرسو تک‌شات', 65000],
      ['کاپوچینو', 'قهوه با فوم شیر', 85000],
      ['لاته وانیل', 'قهوه لاته با شربت وانیل', 95000],
    ];
    for (const [name, description, price] of items) {
      await pool.query(
        'INSERT INTO `MenuItem` (id, venueId, categoryId, name, description, price, isAvailable) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [randomUUID(), venueId, categoryId, name, description, price, true]
      );
    }
  }

  const [customerRow] = await pool.query('SELECT id FROM `User` WHERE email = ?', ['customer@demo.local']);
  const customerId = customerRow[0].id;

  const [existingCoupons] = await pool.query('SELECT id FROM `Coupon`');
  if (existingCoupons.length === 0) {
    await pool.query(
      `INSERT INTO \`Coupon\` (id, venueId, code, discountType, discountValue, minOrderAmount)
       VALUES (?, NULL, 'WELCOME10', 'PERCENT', 10, NULL)`,
      [randomUUID()]
    );
    await pool.query(
      `INSERT INTO \`Coupon\` (id, venueId, code, discountType, discountValue, maxRedemptions, minOrderAmount)
       VALUES (?, ?, 'CAFE20K', 'FIXED', 20000, 50, 100000)`,
      [randomUUID(), venueId]
    );
  }

  const [existingCategoryForItems] = await pool.query('SELECT id FROM `MenuItem` WHERE venueId = ? LIMIT 1', [
    venueId,
  ]);
  const sampleMenuItemId = existingCategoryForItems[0]?.id;

  const [existingOrder] = await pool.query('SELECT id FROM `Order` WHERE customerId = ? LIMIT 1', [customerId]);
  let sampleOrderId = existingOrder[0]?.id;
  if (!sampleOrderId && sampleMenuItemId) {
    sampleOrderId = randomUUID();
    await pool.query(
      `INSERT INTO \`Order\` (id, venueId, customerId, status, paymentStatus, totalAmount, commissionAmount)
       VALUES (?, ?, ?, 'SERVED', 'SUCCESS', 65000, 6500)`,
      [sampleOrderId, venueId, customerId]
    );
    await pool.query(
      'INSERT INTO `OrderItem` (id, orderId, menuItemId, quantity, unitPrice, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
      [randomUUID(), sampleOrderId, sampleMenuItemId, 1, 65000, 65000]
    );
  }

  if (sampleOrderId) {
    const [existingReview] = await pool.query('SELECT id FROM `Review` WHERE orderId = ?', [sampleOrderId]);
    if (existingReview.length === 0) {
      await pool.query(
        `INSERT INTO \`Review\` (id, userId, venueId, orderId, rating, comment)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [randomUUID(), customerId, venueId, sampleOrderId, 5, 'تجربه خیلی خوبی بود، قهوه‌ها عالی بودن!']
      );
    }
  }

  const notificationCategories = ['ORDER_STATUS', 'PROMO', 'LOYALTY', 'SYSTEM'];
  for (const category of notificationCategories) {
    await pool.query(
      'INSERT IGNORE INTO `NotificationPreference` (userId, category, enabled) VALUES (?, ?, TRUE)',
      [customerId, category]
    );
  }

  for (const category of ['NEW_ORDER', 'LOW_REVIEW']) {
    await pool.query(
      'INSERT IGNORE INTO `NotificationPreference` (userId, category, enabled) VALUES (?, ?, TRUE)',
      [ownerId, category]
    );
  }

  // Staff permissions — matches the spec default: order view/manage + table view only.
  const staffDefaultPermissions = ['orders.view', 'orders.manage', 'tables.view'];
  for (const permission of staffDefaultPermissions) {
    await pool.query(
      'INSERT IGNORE INTO `StaffPermission` (userId, permission, granted) VALUES (?, ?, TRUE)',
      [staffId, permission]
    );
  }

  // Demo modifier groups (venue-level, reusable across items).
  const [existingModGroups] = await pool.query('SELECT id FROM `ModifierGroup` WHERE venueId = ?', [venueId]);
  let sizeGroupId, milkGroupId, sugarGroupId, extraGroupId;
  if (existingModGroups.length === 0) {
    sizeGroupId = randomUUID();
    milkGroupId = randomUUID();
    sugarGroupId = randomUUID();
    extraGroupId = randomUUID();

    await pool.query(
      `INSERT INTO \`ModifierGroup\` (id, venueId, name, type, isRequired, minSelections, maxSelections, sortOrder) VALUES
       (?, ?, 'اندازه', 'SINGLE_SELECT', TRUE, 1, 1, 1),
       (?, ?, 'نوع شیر', 'SINGLE_SELECT', FALSE, 0, 1, 2),
       (?, ?, 'سطح شکر', 'SINGLE_SELECT', FALSE, 0, 1, 3),
       (?, ?, 'افزودنی‌ها', 'MULTI_SELECT', FALSE, 0, 3, 4)`,
      [sizeGroupId, venueId, milkGroupId, venueId, sugarGroupId, venueId, extraGroupId, venueId]
    );
    await pool.query(
      `INSERT INTO \`ModifierOption\` (id, groupId, name, priceAdjustment, isDefault, sortOrder) VALUES
       (?, ?, 'متوسط', 0, TRUE, 1),
       (?, ?, 'بزرگ', 15000, FALSE, 2),
       (?, ?, 'شیر معمولی', 0, TRUE, 1),
       (?, ?, 'شیر جو دوسر', 10000, FALSE, 2),
       (?, ?, 'شیر بادام', 10000, FALSE, 3),
       (?, ?, 'بدون شکر', 0, FALSE, 1),
       (?, ?, 'کم‌شیرین', 0, TRUE, 2),
       (?, ?, 'شیرین', 0, FALSE, 3),
       (?, ?, 'شات اضافه', 15000, FALSE, 1),
       (?, ?, 'سیروپ وانیل', 8000, FALSE, 2),
       (?, ?, 'دارچین', 5000, FALSE, 3)`,
      [
        randomUUID(), sizeGroupId,
        randomUUID(), sizeGroupId,
        randomUUID(), milkGroupId,
        randomUUID(), milkGroupId,
        randomUUID(), milkGroupId,
        randomUUID(), sugarGroupId,
        randomUUID(), sugarGroupId,
        randomUUID(), sugarGroupId,
        randomUUID(), extraGroupId,
        randomUUID(), extraGroupId,
        randomUUID(), extraGroupId,
      ]
    );
  } else {
    sizeGroupId = existingModGroups[0]?.id;
    const [allGroups] = await pool.query('SELECT id FROM `ModifierGroup` WHERE venueId = ? ORDER BY sortOrder', [venueId]);
    [sizeGroupId, milkGroupId, sugarGroupId, extraGroupId] = allGroups.map((g) => g.id);
  }

  // Attach modifier groups to latte + cappuccino items.
  const [coffeeItems] = await pool.query('SELECT id, name FROM `MenuItem` WHERE venueId = ? AND name IN (?, ?)', [
    venueId, 'لاته وانیل', 'کاپوچینو',
  ]);
  for (const item of coffeeItems) {
    const [existing] = await pool.query('SELECT 1 FROM `MenuItemModifier` WHERE menuItemId = ?', [item.id]);
    if (existing.length === 0 && sizeGroupId) {
      const groups = item.name === 'لاته وانیل'
        ? [sizeGroupId, milkGroupId, sugarGroupId, extraGroupId]
        : [sizeGroupId, milkGroupId];
      for (let i = 0; i < groups.length; i++) {
        await pool.query(
          'INSERT IGNORE INTO `MenuItemModifier` (menuItemId, groupId, sortOrder) VALUES (?, ?, ?)',
          [item.id, groups[i], i + 1]
        );
      }
    }
  }

  // Sample pairing rule: adding espresso suggests adding کیک شکلاتی (if it exists).
  const [espressoRow] = await pool.query('SELECT id FROM `MenuItem` WHERE venueId = ? AND name = ?', [venueId, 'اسپرسو']);
  const [cakeRow] = await pool.query('SELECT id FROM `MenuItem` WHERE venueId = ? AND name = ?', ['demo-venue-0003', 'کیک شکلاتی']);
  const [cappRow] = await pool.query('SELECT id FROM `MenuItem` WHERE venueId = ? AND name = ?', [venueId, 'کاپوچینو']);
  if (espressoRow[0] && cappRow[0]) {
    await pool.query(
      'INSERT IGNORE INTO `ItemPairingRule` (id, venueId, triggerMenuItemId, suggestedMenuItemId, priority) VALUES (?, ?, ?, ?, ?)',
      [randomUUID(), venueId, espressoRow[0].id, cappRow[0].id, 10]
    );
  }

  // Sample combo bundling espresso + cappuccino at a discount.
  const [existingCombo] = await pool.query('SELECT id FROM `Combo` WHERE venueId = ?', [venueId]);
  if (existingCombo.length === 0) {
    const [comboItems] = await pool.query('SELECT id FROM `MenuItem` WHERE venueId = ? AND name IN (?, ?)', [
      venueId,
      'اسپرسو',
      'کاپوچینو',
    ]);
    if (comboItems.length === 2) {
      const comboId = randomUUID();
      await pool.query(
        'INSERT INTO `Combo` (id, venueId, name, description, price) VALUES (?, ?, ?, ?, ?)',
        [comboId, venueId, 'کمبوی صبحانه', 'یک اسپرسو و یک کاپوچینو با تخفیف ویژه', 130000]
      );
      for (const item of comboItems) {
        await pool.query('INSERT INTO `ComboItem` (id, comboId, menuItemId, quantity) VALUES (?, ?, ?, 1)', [
          randomUUID(),
          comboId,
          item.id,
        ]);
      }
    }
  }

  // A handful of extra demo venues (same owner, for simplicity) so the Home page's
  // discovery filters (neighborhood, tags, rating, distance) have real variety to work with.
  const extraVenues = [
    {
      id: 'demo-venue-0002',
      name: 'کافه کتاب ورق',
      description: 'دیوارهای پوشیده از کتاب، لپ‌تاپ‌های روشن و عطر چای دارچین. بهشت کتاب‌بازها.',
      address: 'تهران، خیابان انقلاب، جنب سینما',
      neighborhood: 'انقلاب',
      tags: ['کتاب‌محور', 'نوشیدنی سرد'],
      coverImageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop',
      lat: 35.7008,
      lng: 51.3896,
      items: [
        ['چای ماسالا', 'چای هندی با دارچین و هل', 70000],
        ['اسموتی توت‌فرنگی', 'نوشیدنی سرد با توت‌فرنگی تازه', 90000],
      ],
      reviews: [
        [5, 'فضای آرومی داره، عالی برای مطالعه.'],
        [4, 'کتاب‌های زیادی داشت، چایش هم خوب بود.'],
      ],
    },
    {
      id: 'demo-venue-0003',
      name: 'کافه نوستالژی',
      description: 'گرامافون، پیانوی قدیمی و اجرای زنده موسیقی جَز، هر شب در دل بافت تاریخی شهر.',
      address: 'تهران، چهارراه استانبول، کوچه بنفشه',
      neighborhood: 'استانبول',
      tags: ['موسیقی زنده', 'دکور کلاسیک'],
      coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop',
      lat: 35.7089,
      lng: 51.4013,
      items: [
        ['کیک شکلاتی', 'کیک خانگی با گاناش شکلات', 110000],
        ['قهوه ترک', 'قهوه ترک سنتی با هل', 75000],
      ],
      reviews: [
        [5, 'موزیک زنده‌اش فوق‌العاده بود!'],
        [5, 'دکور کلاسیکش آدمو می‌بره به گذشته.'],
      ],
    },
    {
      id: 'demo-venue-0004',
      name: 'کافه بام تهران',
      description: 'چشم‌اندازی پانوراما از شهر، نسیم خنک و منوی خاص. غروب‌هایش زبان‌زد است.',
      address: 'تهران، خیابان شریعتی، بالاتر از پل',
      neighborhood: 'شریعتی',
      tags: ['روف‌تاپ', 'مناسب کار'],
      coverImageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=400&fit=crop',
      lat: 35.7325,
      lng: 51.4351,
      items: [
        ['آیس‌لاته', 'قهوه سرد با شیر و یخ', 95000],
        ['ساندویچ کلاب', 'ساندویچ سه‌طبقه با مرغ و سبزیجات', 145000],
      ],
      reviews: [
        [4, 'منظره‌ش عالیه ولی شلوغ بود.'],
        [5, 'برای کار کردن با لپ‌تاپ عالیه، اینترنتش سریع بود.'],
      ],
    },
  ];

  for (const extra of extraVenues) {
    const [existingExtra] = await pool.query('SELECT id FROM `Venue` WHERE id = ?', [extra.id]);
    if (existingExtra.length === 0) {
      await pool.query(
        `INSERT INTO \`Venue\` (id, ownerId, name, description, address, city, neighborhood, tags, coverImageUrl, lat, lng, subscriptionTier, commissionRate, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'FREE', 10.0, 'ACTIVE')`,
        [
          extra.id,
          ownerId,
          extra.name,
          extra.description,
          extra.address,
          'تهران',
          extra.neighborhood,
          JSON.stringify(extra.tags),
          extra.coverImageUrl,
          extra.lat,
          extra.lng,
        ]
      );
    }

    let [extraCategory] = await pool.query('SELECT id FROM `Category` WHERE venueId = ? LIMIT 1', [extra.id]);
    let extraCategoryId;
    if (extraCategory.length === 0) {
      extraCategoryId = randomUUID();
      await pool.query('INSERT INTO `Category` (id, venueId, name, sortOrder) VALUES (?, ?, ?, ?)', [
        extraCategoryId,
        extra.id,
        'منوی کافه',
        1,
      ]);
    } else {
      extraCategoryId = extraCategory[0].id;
    }

    const [extraExistingItems] = await pool.query('SELECT id FROM `MenuItem` WHERE venueId = ?', [extra.id]);
    if (extraExistingItems.length === 0) {
      for (const [name, description, price] of extra.items) {
        await pool.query(
          'INSERT INTO `MenuItem` (id, venueId, categoryId, name, description, price, isAvailable) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [randomUUID(), extra.id, extraCategoryId, name, description, price, true]
        );
      }
    }

    const [extraExistingReviews] = await pool.query('SELECT id FROM `Review` WHERE venueId = ?', [extra.id]);
    if (extraExistingReviews.length === 0) {
      const [extraOrderExisting] = await pool.query('SELECT id FROM `Order` WHERE venueId = ? LIMIT 1', [extra.id]);
      let extraOrderId = extraOrderExisting[0]?.id;
      if (!extraOrderId) {
        extraOrderId = randomUUID();
        await pool.query(
          `INSERT INTO \`Order\` (id, venueId, customerId, status, paymentStatus, totalAmount, commissionAmount)
           VALUES (?, ?, ?, 'SERVED', 'SUCCESS', ?, ?)`,
          [extraOrderId, extra.id, customerId, extra.items[0][2], Math.round(extra.items[0][2] * 0.1)]
        );
      }
      for (const [rating, comment] of extra.reviews) {
        await pool.query(
          `INSERT INTO \`Review\` (id, userId, venueId, orderId, rating, comment) VALUES (?, ?, ?, ?, ?, ?)`,
          [randomUUID(), customerId, extra.id, extraOrderId, rating, comment]
        );
      }
    }
  }

  // Sample settled payout for the venue.
  const [existingPayout] = await pool.query('SELECT id FROM `Payout` WHERE venueId = ?', [venueId]);
  if (existingPayout.length === 0) {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 14);
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() - 7);
    await pool.query(
      `INSERT INTO \`Payout\` (id, venueId, amount, periodStart, periodEnd, status, paidAt)
       VALUES (?, ?, ?, ?, ?, 'PAID', ?)`,
      [randomUUID(), venueId, 450000, periodStart, periodEnd, periodEnd]
    );
  }

  // Default platform settings.
  await pool.query(
    `INSERT INTO \`PlatformSetting\` (\`key\`, value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    ['discovery.radiusMeters', JSON.stringify(100)]
  );
  await pool.query(
    `INSERT INTO \`PlatformSetting\` (\`key\`, value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    ['platform.supportedCities', JSON.stringify(['تهران'])]
  );

  // Sample FAQ content (admin-editable; the customer Support page reads this via /content/faq).
  const [existingFaq] = await pool.query('SELECT id FROM `FaqItem`');
  if (existingFaq.length === 0) {
    const faqItems = [
      ['چطور سفارش خود را پیگیری کنم؟', 'از بخش «سفارش‌ها» در حساب کاربری، وضعیت سفارش‌های فعال شما به‌صورت لحظه‌ای به‌روزرسانی می‌شود.'],
      ['امتیاز وفاداری چگونه محاسبه می‌شود؟', 'به ازای هر خرید موفق، امتیازی متناسب با مبلغ سفارش به کیف پول وفاداری شما اضافه می‌شود. امتیاز بین شعبات یک برند مشترک است.'],
      ['چگونه می‌توانم کد تخفیف را اعمال کنم؟', 'در صفحه سبد سفارش، پیش از پرداخت، کد تخفیف را در فیلد مربوطه وارد و اعمال کنید.'],
      ['در صورت مشکل در سفارش چه کار کنم؟', 'می‌توانید از بخش پشتیبانی یک تیکت جدید ثبت کنید تا واحد مربوطه (فنی، فروش یا مدیریت) موضوع را بررسی کند.'],
      ['آیا می‌توانم سفارشم را لغو کنم؟', 'بله، تا زمانی که کافه سفارش شما را تایید نکرده (وضعیت «در انتظار»)، از صفحه جزئیات سفارش می‌توانید آن را لغو کنید. پس از تایید کافه، امکان لغو توسط مشتری وجود ندارد.'],
      ['برنامه دعوت از دوستان چطور کار می‌کند؟', 'کد دعوت اختصاصی خود را از بخش «دعوت از دوستان» به اشتراک بگذارید. به محض ثبت اولین سفارش موفق دوستتان، پاداش نقدی به کیف پول هر دو نفر واریز می‌شود.'],
      ['کیف پول چیست و چگونه شارژ می‌شود؟', 'کیف پول موجودی داخلی حساب شماست که از طریق پاداش‌های دعوت، بازگشت وجه سفارش‌های لغوشده و تخفیف‌ها شارژ می‌شود و می‌توانید هنگام پرداخت از آن استفاده کنید.'],
      ['چطور میز رزرو کنم؟', 'در صفحه منوی هر کافه، در صورت فعال بودن رزرو، دکمه «رزرو میز» را می‌بینید. تاریخ، ساعت و تعداد نفرات را وارد کرده و رزرو را ثبت کنید.'],
      ['سفارش پیک‌آپ (بیرون‌بر) چیست؟', 'اگر کافه پیک‌آپ را فعال کرده باشد، می‌توانید بدون نیاز به میز، سفارش خود را ثبت و در محل کافه تحویل بگیرید.'],
      ['چطور برای یک کافه نظر ثبت کنم؟', 'پس از سرو شدن سفارش، از صفحه «سفارش‌های من» روی دکمه «ثبت نظر» بزنید و امتیاز و توضیح خود را وارد کنید.'],
      ['اشتراک تخفیف تصادفی چیست؟', 'با خرید اشتراک، هر ماه یک تخفیف تصادفی روی یکی از سفارش‌های شما اعمال می‌شود؛ جزئیات و قیمت در صفحه «اشتراک» قابل مشاهده است.'],
      ['چطور می‌توانم گارسون را از پشت میز صدا بزنم؟', 'در صفحه منوی کافه، کنار دکمه رزرو میز، دکمه «صدا زدن گارسون» وجود دارد که به‌صورت لحظه‌ای به پرسنل کافه اطلاع می‌دهد.'],
      ['چطور حساب کاربری خودم را حذف کنم؟', 'از بخش «حساب کاربری» به قسمت تنظیمات حساس رفته و گزینه «حذف حساب کاربری» را انتخاب کنید. این عملیات قابل بازگشت نیست.'],
      ['آیا اطلاعات پرداخت من امن است؟', 'اطلاعات کارت بانکی شما مستقیماً نزد درگاه پرداخت رسمی ثبت می‌شود و هیچ‌گاه روی سرورهای ما ذخیره نمی‌شود.'],
      ['چرا نمی‌توانم سفارش ثبت کنم؟', 'ممکن است کافه موقتاً تعطیل باشد یا اتصال اینترنت شما قطع باشد. وضعیت کافه در بالای صفحه منو نمایش داده می‌شود.'],
    ];
    for (let i = 0; i < faqItems.length; i++) {
      const [question, answer] = faqItems[i];
      await pool.query('INSERT INTO `FaqItem` (id, question, answer, sortOrder) VALUES (?, ?, ?, ?)', [
        randomUUID(),
        question,
        answer,
        i,
      ]);
    }
  }

  // Demo brand for multi-branch feature
  const [existingBrand] = await pool.query("SELECT id FROM `VenueBrand` WHERE name = 'کافه‌های دمو' LIMIT 1");
  let demoBrandId;
  if (existingBrand.length === 0) {
    demoBrandId = randomUUID();
    await pool.query('INSERT INTO `VenueBrand` (id, ownerId, name) VALUES (?, ?, ?)', [demoBrandId, ownerId, 'کافه‌های دمو']);
    await pool.query('UPDATE `Venue` SET brandId = ? WHERE id = ?', [demoBrandId, venueId]);
  }

  // Enable inventory for demo venue
  await pool.query('UPDATE `Venue` SET inventoryEnabled = TRUE WHERE id = ?', [venueId]);

  // Demo raw materials
  const [existingMaterials] = await pool.query('SELECT id FROM `RawMaterial` WHERE venueId = ? LIMIT 1', [venueId]);
  let milkId, coffeeId, cupId;
  if (existingMaterials.length === 0) {
    milkId = randomUUID(); coffeeId = randomUUID(); cupId = randomUUID();
    await pool.query('INSERT INTO `RawMaterial` (id, venueId, name, unit, currentStock, reorderThreshold, costPerUnit) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [milkId, venueId, 'شیر', 'میلی‌لیتر', 10000, 2000, 0.05]);
    await pool.query('INSERT INTO `RawMaterial` (id, venueId, name, unit, currentStock, reorderThreshold, costPerUnit) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [coffeeId, venueId, 'دانه قهوه', 'گرم', 5000, 500, 0.8]);
    await pool.query('INSERT INTO `RawMaterial` (id, venueId, name, unit, currentStock, reorderThreshold, costPerUnit) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cupId, venueId, 'لیوان', 'عدد', 200, 50, 150]);

    // Link to first menu item (latte / espresso — whatever exists)
    const [firstItems] = await pool.query('SELECT id FROM `MenuItem` WHERE venueId = ? LIMIT 2', [venueId]);
    if (firstItems[0]) {
      const rId1 = randomUUID(), rId2 = randomUUID(), rId3 = randomUUID();
      await pool.query('INSERT INTO `RecipeItem` (id, menuItemId, rawMaterialId, quantity) VALUES (?, ?, ?, ?)', [rId1, firstItems[0].id, milkId, 200]);
      await pool.query('INSERT INTO `RecipeItem` (id, menuItemId, rawMaterialId, quantity) VALUES (?, ?, ?, ?)', [rId2, firstItems[0].id, coffeeId, 18]);
      await pool.query('INSERT INTO `RecipeItem` (id, menuItemId, rawMaterialId, quantity) VALUES (?, ?, ?, ?)', [rId3, firstItems[0].id, cupId, 1]);
    }
  }

  // Tier configs (Bronze / Silver / Gold)
  const [existingTiers] = await pool.query('SELECT id FROM `TierConfig` LIMIT 1');
  if (existingTiers.length === 0) {
    const tierData = [
      { name: 'برنز', icon: '🥉', minSpend: 0,      minOrders: 0,  pointsMultiplier: 1.00, perks: null,                                                          sortOrder: 1 },
      { name: 'نقره', icon: '🥈', minSpend: 500000, minOrders: 5,  pointsMultiplier: 1.25, perks: ['تخفیف ۵٪ در سفارش‌های بعدی'],                               sortOrder: 2 },
      { name: 'طلا',  icon: '🥇', minSpend: 2000000,minOrders: 20, pointsMultiplier: 1.50, perks: ['تخفیف ۱۰٪ در سفارش‌های بعدی', 'اولویت پشتیبانی'],           sortOrder: 3 },
    ];
    for (const t of tierData) {
      await pool.query(
        'INSERT INTO `TierConfig` (id, name, icon, minSpend, minOrders, pointsMultiplier, perks, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [randomUUID(), t.name, t.icon, t.minSpend, t.minOrders, t.pointsMultiplier, t.perks ? JSON.stringify(t.perks) : null, t.sortOrder]
      );
    }
  }

  // Badge configs
  const [existingBadges] = await pool.query('SELECT id FROM `BadgeConfig` LIMIT 1');
  if (existingBadges.length === 0) {
    const badgeData = [
      { name: 'اولین قدم',     icon: '🎉', description: 'اولین سفارش موفق خود را ثبت کردید!',                 criteriaType: 'TOTAL_ORDERS',        threshold: 1      },
      { name: 'مشتری وفادار',  icon: '🏅', description: 'بیش از ۱۰ سفارش در یک کافه ثبت کردید.',              criteriaType: 'ORDERS_AT_VENUE',     threshold: 10     },
      { name: 'کاشف',          icon: '🗺️', description: 'از ۵ کافه مختلف سفارش دادید.',                       criteriaType: 'DISTINCT_VENUES',     threshold: 5      },
      { name: 'مشتری ماه',     icon: '📅', description: 'اولین سفارش ماه جاری در یک کافه را ثبت کردید.',     criteriaType: 'FIRST_ORDER_OF_MONTH',threshold: 1      },
      { name: 'ولخرج بزرگ',   icon: '💎', description: 'در مجموع بیش از ۵۰۰,۰۰۰ تومان خرید کردید.',          criteriaType: 'TOTAL_SPEND',         threshold: 500000 },
    ];
    for (const b of badgeData) {
      await pool.query(
        'INSERT INTO `BadgeConfig` (id, name, icon, description, criteriaType, threshold) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), b.name, b.icon, b.description, b.criteriaType, b.threshold]
      );
    }
  }

  // Plan configs
  const [existingPlans] = await pool.query('SELECT id FROM PlanConfig LIMIT 1');
  if (existingPlans.length === 0) {
    const planRows = [
      { tier: 'FREE',  name: 'رایگان',       commissionRate: 0.10, monthlyPrice: 0,         yearlyPrice: 0,          yearlyDiscountPct: 0,     trialDays: 0, sortOrder: 0,
        features: JSON.stringify({ maxMenuItems: 30,   multiBranch: false, inventoryTracking: false, aiForecasting: false, advancedAnalytics: false, apiAccess: false, supportLevel: 'email',     trialEligible: false }) },
      { tier: 'PRO',   name: 'حرفه‌ای',      commissionRate: 0.05, monthlyPrice: 10000000,  yearlyPrice: 100000000,  yearlyDiscountPct: 16.67, trialDays: 7, sortOrder: 1,
        features: JSON.stringify({ maxMenuItems: null, multiBranch: true,  inventoryTracking: true,  aiForecasting: false, advancedAnalytics: true,  apiAccess: false, supportLevel: 'priority',  trialEligible: true  }) },
      { tier: 'ULTRA', name: 'حرفه‌ای‌پلاس', commissionRate: 0.01, monthlyPrice: 20000000,  yearlyPrice: 200000000,  yearlyDiscountPct: 16.67, trialDays: 7, sortOrder: 2,
        features: JSON.stringify({ maxMenuItems: null, multiBranch: true,  inventoryTracking: true,  aiForecasting: true,  advancedAnalytics: true,  apiAccess: true,  supportLevel: 'dedicated', trialEligible: true  }) },
    ];
    for (const p of planRows) {
      await pool.query(
        'INSERT INTO PlanConfig (id, tier, name, commissionRate, monthlyPrice, yearlyPrice, yearlyDiscountPct, trialDays, features, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [randomUUID(), p.tier, p.name, p.commissionRate, p.monthlyPrice, p.yearlyPrice, p.yearlyDiscountPct, p.trialDays, p.features, p.sortOrder]
      );
    }
    for (const [key, value] of [['trial.shortDays','5'],['trial.longDays','7'],['trial.revenueThreshold','5000000']]) {
      await pool.query('INSERT INTO PlatformSetting (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?', [key, value, value]);
    }
  }

  console.log('داده‌های نمونه با موفقیت ایجاد شد.');
  console.log({ superAdminId, ownerId, staffId, venueId, qrToken });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
