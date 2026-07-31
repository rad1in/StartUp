// One-time production launch script.
//
// What it does:
//   1. Refuses to run a second time (checks a PlatformSetting lock).
//   2. Asks for explicit typed confirmation, since step 4 is destructive.
//   3. Prompts for the real admin account's name/email/password.
//   4. Wipes every demo/instance table (users, venues, orders, reviews,
//      wallets, everything seed.js created) — but keeps platform-level
//      config (integration credentials, commission plans, city list,
//      migration history) since those are real settings, not demo data.
//   5. Deletes demo-uploaded files (avatars/logos/menu photos) from disk.
//   6. Creates exactly one SUPER_ADMIN user from what you entered.
//   7. Writes the lock so this can never run again.
//
// Run with: npm run go-live
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { pool } = require('../lib/db');
const { config } = require('../config/config');

// Config/reference tables — real production settings, not demo instance
// data — so go-live must leave these alone.
const KEEP_TABLES = new Set([
  'SchemaMigration',
  'PlatformSetting',
  'PlanConfig',
  'City',
  'TierConfig',
  'BadgeConfig',
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CTRL_C = 3;
const ENTER_CR = 13;
const ENTER_LF = 10;
const BACKSPACE_DEL = 127;
const BACKSPACE_BS = 8;

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// No readline API masks input, so echo is suppressed manually in raw mode —
// a password typed for the platform's one real admin account should never
// be visible on a screen someone might be sharing/recording.
function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');

    let value = '';
    const onData = (chunk) => {
      const code = chunk.charCodeAt(0);
      if (code === CTRL_C) {
        process.stdout.write('\n');
        process.exit(1);
      }
      if (code === ENTER_CR || code === ENTER_LF) {
        stdin.setRawMode(wasRaw ?? false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(value);
        return;
      }
      if (code === BACKSPACE_DEL || code === BACKSPACE_BS) {
        value = value.slice(0, -1);
        return;
      }
      value += chunk;
    };
    stdin.on('data', onData);
  });
}

function deleteDirContents(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

async function main() {
  console.log('=== ET-Cafe -- راه‌اندازی نهایی برای انتشار عمومی ===\n');

  const [[lock]] = await pool.query("SELECT value FROM `PlatformSetting` WHERE `key` = 'platform.launchedAt'");
  if (lock) {
    const launchedAt = JSON.parse(lock.value);
    console.error(
      `این دستور قبلاً یک‌بار در تاریخ ${launchedAt} اجرا شده و برای جلوگیری از پاک شدن تصادفی اطلاعات واقعی، فقط یک‌بار قابل اجراست.\n` +
        'اگر واقعاً نیاز به پاک‌سازی مجدد دارید، ردیف platform.launchedAt را دستی از جدول PlatformSetting حذف کنید -- این کار توصیه نمی‌شود.'
    );
    process.exit(1);
  }

  console.log(
    'این عملیات همه کافه‌ها، کاربران، سفارش‌ها، نظرات و هر داده نمایشی دیگری را برای همیشه حذف می‌کند\n' +
      'و به‌جایش فقط یک حساب مدیر کل واقعی می‌سازد. این کار غیرقابل بازگشت است.\n'
  );
  const confirmation = await ask('برای تایید، عبارت "پاک‌سازی و انتشار" را دقیقاً تایپ کنید: ');
  if (confirmation !== 'پاک‌سازی و انتشار') {
    console.log('عبارت تایید مطابقت نداشت -- عملیات لغو شد. هیچ داده‌ای تغییر نکرد.');
    process.exit(1);
  }

  let name = '';
  while (!name) {
    name = await ask('\nنام کامل مدیر کل: ');
  }

  let email = '';
  while (!EMAIL_PATTERN.test(email)) {
    email = await ask('ایمیل مدیر کل: ');
    if (!EMAIL_PATTERN.test(email)) console.log('ایمیل نامعتبر است، دوباره وارد کنید.');
  }

  let password = '';
  for (;;) {
    password = await askHidden('رمز عبور مدیر کل (حداقل ۱۰ کاراکتر): ');
    if (password.length < 10) {
      console.log('رمز عبور خیلی کوتاه است.');
      continue;
    }
    const confirmPassword = await askHidden('تکرار رمز عبور: ');
    if (confirmPassword !== password) {
      console.log('رمزها یکسان نبودند، دوباره تلاش کنید.');
      continue;
    }
    break;
  }

  console.log('\nدر حال پاک‌سازی داده‌های نمایشی...');
  const [rows] = await pool.query(
    'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()'
  );
  const tables = rows.map((r) => r.name).filter((t) => !KEEP_TABLES.has(t));

  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tables) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    connection.release();
  }
  console.log(`${tables.length} جدول پاک‌سازی شد.`);

  console.log('در حال حذف فایل‌های آپلودشده نمایشی...');
  const uploadsRoot = path.resolve(__dirname, '../../', config.uploadDir);
  for (const subdir of ['avatars', 'profile-covers', 'venues', 'menu', 'support-attachments']) {
    deleteDirContents(path.join(uploadsRoot, subdir));
  }
  console.log('فایل‌های نمایشی حذف شدند.');

  console.log('در حال ساخت حساب مدیر کل...');
  const passwordHash = await bcrypt.hash(password, 10);
  const adminId = randomUUID();
  await pool.query(
    'INSERT INTO `User` (id, email, name, passwordHash, role) VALUES (?, ?, ?, ?, ?)',
    [adminId, email, name, passwordHash, 'SUPER_ADMIN']
  );

  await pool.query(
    "INSERT INTO `PlatformSetting` (`key`, value) VALUES ('platform.launchedAt', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
    [JSON.stringify(new Date().toISOString())]
  );

  console.log('\n=== انجام شد ===');
  console.log(`حساب مدیر کل ساخته شد: ${email}`);
  console.log('این دستور دیگر هیچ‌وقت قابل اجرا نیست. پلتفرم آماده انتشار عمومی است.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\nخطا در اجرای go-live:', err);
  process.exit(1);
});
