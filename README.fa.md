[🇬🇧 Read in English](README.md)

# پلتفرم سفارش آنلاین رستوران و کافه (QR / Location-Based Ordering Platform)

پلتفرمی برای رستوران‌ها و کافه‌ها که فرآیند سنتی «اسکن منو → انتظار برای گارسون → سفارش» را با یک تجربه کاملاً خودکار جایگزین می‌کند. مشتری با تشخیص موقعیت مکانی یا اسکن کد QR روی میز، مستقیماً به منوی مجموعه می‌رسد، سفارش می‌دهد و پرداخت می‌کند.

این ریپازیتوری شامل سه پروژه مستقل است:

- `/backend` — Express + mysql2 (SQL خام، بدون ORM) + MySQL + Socket.IO
- `/frontend` — React + Vite + Tailwind CSS (چندزبانه: فارسی/انگلیسی/عربی/ترکی، فونت Vazirmatn)
- `/mobile` — React Native + Expo Router (اپ موبایل مشتری، صاحب مجموعه و مدیر پلتفرم)

---

## 1. StartUp (راه‌اندازی کامل پروژه)

### پیش‌نیازها

- Node.js نسخه ۱۸ یا بالاتر (LTS)
- MySQL نسخه ۸ یا بالاتر (یک دیتابیس خالی، مثلاً `qr_ordering`)
- npm (همراه Node نصب می‌شود)

### مراحل راه‌اندازی از صفر

```bash
# 1. کلون کردن ریپازیتوری
git clone <repo-url>
cd StartUp

# 2. تنظیم متغیرهای محیطی بک‌اند
cd backend
cp .env.example .env
# مقادیر DB_HOST/DB_USER/DB_PASSWORD/DB_NAME و JWT secrets را در .env ویرایش کنید
# دیتابیس MySQL با همین نام (مثلاً qr_ordering) باید از قبل در سرور MySQL ساخته شده باشد

# 3. نصب وابستگی‌ها، اجرای مایگریشن و seed
npm install
npm run db:migrate
npm run db:seed

# 4. اجرای سرور بک‌اند (در همین ترمینال)
npm run dev
```

```bash
# 5. در یک ترمینال جدید — تنظیم و اجرای فرانت‌اند
cd frontend
cp .env.example .env
# مقادیر VITE_API_URL و VITE_NESHAN_API_KEY را در صورت نیاز ویرایش کنید

npm install
npm run dev
```

```bash
# 6. (اختیاری) اپ موبایل
cd mobile
cp .env.example .env
npm install
npm start
```

پس از اجرای هر دو سرویس:
- بک‌اند روی `http://localhost:5000`
- فرانت‌اند روی `http://localhost:5173`

داده‌های نمونه (seed) شامل این حساب‌های کاربری است (رمز عبور همه: `Password123!`):

| نقش | ایمیل |
|---|---|
| مدیر کل پلتفرم (`SUPER_ADMIN`) | `admin@platform.local` |
| مالک مجموعه (`VENUE_OWNER`) | `owner@demo-cafe.local` |
| کارمند مجموعه (`VENUE_STAFF`) | `staff@demo-cafe.local` |
| مشتری نمونه (`CUSTOMER`) | `customer@demo.local` |

کد QR میز نمونه: `demo-qr-token-0001` (از طریق دکمه «اسکن QR کد» در صفحه اصلی قابل تست است).

### متغیرهای محیطی

هر سه پروژه یک فایل `.env.example` کامل و مستندسازی‌شده دارند (`backend/.env.example`، `frontend/.env.example`، `mobile/.env.example`) — برای فهرست کامل متغیرها و توضیح هرکدام به همان فایل‌ها مراجعه کنید.

---

## 2. FrontEnd

### دستورات توسعه

```bash
cd frontend
npm install
npm run dev        # اجرای سرور توسعه Vite روی پورت 5173
npm run build       # بیلد نسخه Production در پوشه dist/
npm run preview     # پیش‌نمایش بیلد Production
```

### پیکربندی مورد نیاز

- `VITE_API_URL` باید به آدرس بک‌اند در حال اجرا اشاره کند.
- `VITE_NESHAN_API_KEY` برای نمایش نقشه و مارکرها لازم است (رجوع به [مستندات نشان](https://platform.neshan.org/docs/)).
- فونت Vazirmatn از طریق پکیج `@fontsource/vazirmatn` بارگذاری می‌شود.
- زبان و جهت صفحه (RTL/LTR) به‌صورت پویا بر اساس زبان انتخابی کاربر تنظیم می‌شود (فارسی/عربی راست‌به‌چپ، انگلیسی/ترکی چپ‌به‌راست).

---

## 3. BackEnd

### دستورات توسعه

```bash
cd backend
npm install
npm run dev          # اجرای سرور با nodemon روی پورت 5000
```

### دیتابیس (mysql2 خام — بدون ORM)

هیچ ORM ای استفاده نمی‌شود؛ اتصال به MySQL مستقیماً از طریق یک connection pool در `mysql2/promise` انجام می‌شود و کوئری‌ها به‌صورت SQL خام و پارامتری در هر ماژول نوشته شده‌اند.

```bash
npm run db:migrate    # اجرای مایگریشن‌های نسخه‌دار روی دیتابیس
npm run db:seed        # پر کردن دیتابیس با داده‌های نمونه (فقط محیط توسعه)
```

> نکته: دیتابیس مشخص‌شده در `DB_NAME` باید از قبل در MySQL ساخته شده باشد (مثلاً با `CREATE DATABASE qr_ordering;`)؛ اسکریپت مایگریشن فقط جدول‌ها را می‌سازد، نه خودِ دیتابیس را.

### اجرا در Production

```bash
cd backend
npm install --production
npm run db:migrate
npm start
```

### آماده‌سازی برای انتشار عمومی

```bash
npm run go-live   # یک‌بار مصرف: پاک‌سازی داده‌های دمو + ساخت اکانت ادمین اصلی
```

---

## 4. Mobile

اپ موبایل (React Native + Expo Router SDK 54) شامل سه پنل مجزا بر اساس نقش کاربر است: مشتری (اسکن QR، سفارش، کیف پول، وفاداری)، صاحب مجموعه (سفارش‌های زنده، منو، تنظیمات، بازاریابی) و مدیر پلتفرم.

```bash
cd mobile
npm install
npm start          # اجرای Expo dev server — با Expo Go یا شبیه‌ساز اسکن کنید
```

آپدیت‌های JS-only پس از انتشار از طریق EAS Update بدون نیاز به ارسال نسخه جدید به استور منتشر می‌شوند:

```bash
npm run update:production
```

---

## معماری احراز هویت و دسترسی (RBAC)

سیستم احراز هویت واحد بر پایه JWT با ۴ نقش کاربری:

- `CUSTOMER` — امکان سفارش مهمان (بدون ورود) یا با حساب کاربری برای دسترسی به تاریخچه، تخفیف و امتیاز وفاداری
- `VENUE_STAFF` — دسترسی محدود به مجموعه خود (بر اساس `venueId`)
- `VENUE_OWNER` — دسترسی کامل به پنل مجموعه خود
- `SUPER_ADMIN` — دسترسی کامل به تمام پلتفرم

Access token کوتاه‌مدت در حافظه فرانت‌اند نگه‌داری می‌شود و refresh token بلندمدت در کوکی httpOnly ذخیره می‌شود. کارمزد هر مجموعه بر اساس پلن اشتراک (`FREE`/`PRO`/`ULTRA`) به‌صورت خودکار محاسبه و در گزارش‌های حسابداری اعمال می‌شود.

---

## زیرساخت و مانیتورینگ

- **CI**: هر push/PR روی شاخه `main` تست‌های بک‌اند (با MySQL واقعی)، بیلد فرانت‌اند و بررسی پیکربندی موبایل را اجرا می‌کند (`.github/workflows/ci.yml`).
- **مانیتورینگ خطا (Sentry)**: در هر سه پروژه فعال است؛ فقط با تنظیم `SENTRY_DSN` در `.env` فعال می‌شود.
- **آپدیت OTA موبایل**: از طریق EAS Update.
