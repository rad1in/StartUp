// Demo content for the social feed (Explore grid) — run manually with
// `node src/db/seedSocialPosts.js` (or `npm run db:seed:social`). Idempotent:
// running it twice just tops posts back up to TARGET_POST_COUNT rather than
// duplicating everything, so it's safe to re-run after wiping test data.
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../lib/db');

const TARGET_POST_COUNT = 80;

const CREATORS = [
  { username: 'sara_coffee', name: 'سارا احمدی', bio: 'عاشق قهوه‌های تخصصی و صبحونه‌های دنج ☕' },
  { username: 'ali_foodie', name: 'علی رضایی', bio: 'دنبال بهترین کافه‌های شهر می‌گردم' },
  { username: 'niloofar_c', name: 'نیلوفر کریمی', bio: 'عکاسی از فنجون‌های قهوه، شغل دوممه' },
  { username: 'reza_barista', name: 'رضا محمدی', bio: 'باریستا | لاته آرت | کافه‌گرد حرفه‌ای' },
  { username: 'mina_desserts', name: 'مینا صادقی', bio: 'دسر و کیک‌های خونگی، کافه به کافه' },
  { username: 'amir_travels', name: 'امیر حسینی', bio: 'هر شهر یه کافه‌ی جدید برای کشف' },
];

const CAPTIONS = [
  'یه صبح خوب با یه فنجون قهوه‌ی داغ ☕✨',
  'این کاپوچینو رو باید امتحان کنید، عالیه!',
  'فضای دنج این کافه رو ببینید 😍',
  'لاته آرت امروز، نظرتون چیه؟',
  'بهترین کیک شکلاتی که تا حالا خوردم',
  'یه بعدازظهر آروم با دوستان',
  'قهوه‌ی امروز، حال امروز',
  'این میز کنار پنجره رو خیلی دوست دارم',
  'صبحونه‌ی امروز خیلی خوشمزه بود',
  'کافه جدید پیدا کردم، حتماً برید',
  'دسر جدید منو، خیلی محبوب شده',
  'یه شب دنج با موسیقی زنده',
  'قهوه‌ساز جدید کافه رو امتحان کردیم',
  'این ترکیب رنگ‌ها رو ببینید، چقدر قشنگه',
  'با دوستام یه روز عالی داشتیم',
];

async function upsertCreator({ username, name, bio }, index) {
  const email = `${username}@demo.social.local`;
  const [existing] = await pool.query('SELECT id FROM `User` WHERE email = ?', [email]);
  if (existing.length > 0) return existing[0].id;

  const id = randomUUID();
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const avatarUrl = `https://i.pravatar.cc/300?img=${(index % 70) + 1}`;
  await pool.query(
    `INSERT INTO \`User\`
       (id, email, name, passwordHash, role, username, bio, avatarUrl, isProfilePublic)
     VALUES (?, ?, ?, ?, 'CUSTOMER', ?, ?, ?, TRUE)`,
    [id, email, name, passwordHash, username, bio, avatarUrl]
  );
  return id;
}

async function main() {
  const creatorIds = [];
  for (let i = 0; i < CREATORS.length; i += 1) {
    creatorIds.push(await upsertCreator(CREATORS[i], i));
  }

  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM `Post`');
  const toCreate = Math.max(0, TARGET_POST_COUNT - count);
  if (toCreate === 0) {
    console.log(`از قبل ${count} پست دمو وجود دارد — نیازی به ساخت پست جدید نیست.`);
    return;
  }

  const now = Date.now();
  for (let i = 0; i < toCreate; i += 1) {
    const id = randomUUID();
    const userId = creatorIds[i % creatorIds.length];
    const caption = CAPTIONS[i % CAPTIONS.length];
    // picsum.photos serves a different real photo per unique seed — using the
    // loop index as the seed means every demo post gets a distinct image.
    const imageUrl = `https://picsum.photos/seed/etcafe-post-${count + i}/900/1125`;
    // Spread creation timestamps over the last ~60 days so the feed doesn't
    // look like it was all posted in the same second.
    const createdAt = new Date(now - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000));

    await pool.query('INSERT INTO `Post` (id, userId, imageUrl, caption, createdAt) VALUES (?, ?, ?, ?, ?)', [
      id,
      userId,
      imageUrl,
      caption,
      createdAt,
    ]);
  }

  console.log(`${toCreate} پست دمو ساخته شد (مجموع: ${count + toCreate}).`);
}

main()
  .catch((err) => {
    console.error('ساخت پست‌های دمو با خطا مواجه شد:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
