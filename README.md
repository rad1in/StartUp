# پلتفرم سفارش آنلاین رستوران و کافه (QR / Location-Based Ordering Platform)

پلتفرمی برای رستوران‌ها و کافه‌ها که فرآیند سنتی «اسکن منو → انتظار برای گارسون → سفارش» را با یک تجربه کاملاً خودکار جایگزین می‌کند. مشتری با تشخیص موقعیت مکانی یا اسکن کد QR روی میز، مستقیماً به منوی مجموعه می‌رسد، سفارش می‌دهد و پرداخت می‌کند.

این ریپازیتوری شامل دو پروژه مستقل است:

- `/backend` — Express + mysql2 (SQL خام، بدون ORM) + MySQL + Socket.IO
- `/frontend` — React + Vite + Tailwind CSS (راست‌به‌چپ، فونت Vazirmatn)

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

پس از اجرای هر دو سرویس:
- بک‌اند روی `http://localhost:4000`
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

**بک‌اند (`backend/.env`):**

| متغیر | توضیح | مقدار نمونه |
|---|---|---|
| `DB_HOST` | آدرس سرور MySQL | `localhost` |
| `DB_PORT` | پورت MySQL | `3306` |
| `DB_USER` | نام کاربری MySQL | `root` |
| `DB_PASSWORD` | رمز عبور MySQL | (خالی در محیط توسعه) |
| `DB_NAME` | نام دیتابیس | `qr_ordering` |
| `PORT` | پورت سرور Express | `4000` |
| `JWT_SECRET` | کلید امضای access token | `replace-with-a-long-random-access-secret` |
| `JWT_REFRESH_SECRET` | کلید امضای refresh token | `replace-with-a-long-random-refresh-secret` |
| `JWT_EXPIRES_IN` | مدت اعتبار access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | مدت اعتبار refresh token | `7d` |
| `CORS_ORIGIN` | آدرس مجاز برای CORS | `http://localhost:5173` |
| `SOCKET_CORS_ORIGIN` | آدرس مجاز برای Socket.IO | `http://localhost:5173` |
| `PAYMENT_PROVIDER` | نام درگاه پرداخت فعال (فعلاً فقط `mock`) | `mock` |
| `MOCK_PAYMENT_OUTCOME` | نتیجه شبیه‌سازی‌شده پرداخت (`success`/`fail`/`pending`) | `success` |
| `NESHAN_API_KEY` | کلید API نشان (جایگزین شود) | `your-neshan-api-key` |
| `SMS_PROVIDER` | ارائه‌دهنده پیامک برای کد تایید شماره موبایل (فعلاً فقط `mock`) | `mock` |
| `LOYALTY_DEFAULT_POINTS_RATE` | امتیاز وفاداری به ازای هر ۱۰,۰۰۰ تومان (وقتی مجموعه نرخ اختصاصی ندارد) | `1` |
| `LOYALTY_POINT_VALUE` | ارزش هر امتیاز وفاداری هنگام استفاده (تومان) | `1000` |
| `UPLOAD_DIR` | پوشه محلی برای فایل‌های آپلودی (آواتار و ...) | `uploads` |

**فرانت‌اند (`frontend/.env`):**

| متغیر | توضیح | مقدار نمونه |
|---|---|---|
| `VITE_API_URL` | آدرس پایه API بک‌اند | `http://localhost:4000/api` |
| `VITE_SOCKET_URL` | آدرس سرور Socket.IO | `http://localhost:4000` |
| `VITE_NESHAN_API_KEY` | کلید API نشان برای نقشه (جایگزین شود) | `your-neshan-api-key` |
| `VITE_PAYMENT_PUBLIC_KEY` | کلید عمومی درگاه پرداخت آینده (جایگزین شود) | `your-payment-gateway-public-key` |

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

### ساختار پوشه‌ها

```
frontend/src/
  main.jsx, App.jsx        # نقطه ورود و مسیریابی (react-router-dom)
  styles/                   # فونت Vazirmatn + تنظیمات Tailwind
  context/AuthContext.jsx    # مدیریت وضعیت احراز هویت (access token در حافظه)
  services/                  # api.js (axios + رفرش خودکار توکن), socket.js, geolocation.js, neshan.js
  hooks/                     # useAuth, useGeolocation, useVenueSocket
  components/                 # کامپوننت‌های مشترک: Layout, ProtectedRoute, Button, Card, ...
  pages/
    Home/                     # صفحه اصلی: کشف مجموعه‌های نزدیک + اسکن QR + کشف عمومی
    Pricing/                  # صفحه تعرفه‌های اشتراک
    auth/                     # ورود و ثبت‌نام
    menu/VenueMenuPage.jsx     # صفحه منو + سبد خرید + پرداخت (ورودی مشترک برای GPS و QR)
    customer/                  # پنل حساب کاربری مشتری
    venue/                      # پنل مدیریت مجموعه (سفارش‌ها، منو، حسابداری)
    admin/                       # پنل مدیریت کل پلتفرم
```

### پیکربندی مورد نیاز

- `VITE_API_URL` باید به آدرس بک‌اند در حال اجرا اشاره کند.
- `VITE_NESHAN_API_KEY` برای نمایش نقشه و مارکرها لازم است (رجوع به [مستندات نشان](https://platform.neshan.org/docs/)).
- فونت Vazirmatn از طریق پکیج `@fontsource/vazirmatn` و در `src/styles/index.css` بارگذاری می‌شود؛ نیازی به تنظیم دستی فونت نیست.
- جهت صفحه به‌صورت RTL در `index.html` (`dir="rtl" lang="fa"`) تنظیم شده است.

---

## 3. BackEnd

### دستورات توسعه

```bash
cd backend
npm install
npm run dev          # اجرای سرور با nodemon روی پورت 4000
```

### دیتابیس (mysql2 خام — بدون ORM)

هیچ ORM ای استفاده نمی‌شود؛ اتصال به MySQL مستقیماً از طریق یک connection pool در `mysql2/promise` انجام می‌شود و کوئری‌ها به‌صورت SQL خام و پارامتری در هر ماژول نوشته شده‌اند.

```bash
npm run db:migrate    # اجرای backend/src/db/schema.sql روی دیتابیس (drop/create مجدد جدول‌ها — مخصوص محیط توسعه)
npm run db:seed        # پر کردن دیتابیس با داده‌های نمونه (backend/src/db/seed.js)
```

> نکته: دیتابیس مشخص‌شده در `DB_NAME` باید از قبل در MySQL ساخته شده باشد (مثلاً با `CREATE DATABASE qr_ordering;`)؛ اسکریپت مایگریشن فقط جدول‌ها را می‌سازد، نه خودِ دیتابیس را.

### ساختار پوشه‌ها

```
backend/
  src/
    server.js                  # اجرای HTTP server + اتصال Socket.IO
    app.js                       # پیکربندی Express و مسیرها
    config/config.js              # خواندن متغیرهای محیطی (DB_HOST/DB_PORT/... , JWT، CORS، ...)
    db/
      schema.sql                   # تعریف کامل جدول‌ها (CREATE TABLE)
      migrate.js                    # اجرای schema.sql روی دیتابیس
      seed.js                        # درج داده‌های نمونه
    lib/
      db.js                          # connection pool مربوط به mysql2/promise
      sqlHelpers.js                   # توابع عمومی findById/updateById/deleteById
      jwt.js                           # امضا/اعتبارسنجی access و refresh token
      upload.js                        # تنظیمات multer برای آپلود آواتار (backend/uploads/avatars)
      pdf.js                            # تولید فاکتور PDF سفارش با pdfkit
    middleware/                     # auth.js (authenticate/requireRole/requireVenueScope), errorHandler.js, rateLimit.js
    payments/                        # انتزاع درگاه پرداخت: PaymentProvider.js, MockPaymentProvider.js, index.js (factory)
    sms/                              # انتزاع ارسال پیامک (مشابه payments/): SmsProvider.js, MockSmsProvider.js, index.js
    sockets/index.js                  # اتاق‌های Socket.IO بر اساس venueId و customerId
    modules/
      auth/          # ثبت‌نام، ورود، رفرش توکن، خروج، تغییر رمز، تایید شماره موبایل با OTP
      venues/         # CRUD مجموعه‌ها، جستجوی نزدیک (Haversine)، تبدیل QR به venue/table
      menu/            # مدیریت دسته‌بندی و آیتم‌های منو
      orders/           # ثبت سفارش با تراکنش SQL (کوپن + امتیاز وفاداری + تخفیف)، سفارش مجدد، فاکتور PDF
      payments/          # چک‌اوت و تایید پرداخت با استفاده از PaymentProvider
      accounting/         # گزارش فروش با کوئری‌های تجمیعی SQL (SUM/GROUP BY)
      customers/           # پروفایل، آواتار، نشست‌های فعال، آدرس‌ها، خروجی داده، حذف حساب
      admin/                # مدیریت کاربران، مجموعه‌ها و اشتراک‌ها (فقط مدیر کل)
      loyalty/               # موجودی و تاریخچه امتیاز وفاداری
      coupons/                # اعتبارسنجی کد تخفیف
      favorites/               # مجموعه‌ها و آیتم‌های موردعلاقه، بازدیدهای اخیر
      reviews/                  # ثبت/ویرایش/حذف نظر برای مجموعه یا آیتم منو
      notifications/             # مرکز اعلان‌های درون‌برنامه‌ای و تنظیمات آن
      support/                    # ثبت تیکت پشتیبانی
      staff/                       # مدیریت کارمندان مجموعه و دسترسی‌های آن‌ها (فقط مالک)
```

### اجرا در Production

```bash
cd backend
npm install --production
npm run db:migrate   # ساخت/به‌روزرسانی جدول‌ها روی دیتابیس Production
npm start               # اجرای سرور با node (بدون nodemon)
```

### پیکربندی مورد نیاز

- `DB_HOST`، `DB_PORT`، `DB_USER`، `DB_PASSWORD` و `DB_NAME` باید به یک نمونه MySQL در دسترس اشاره کنند؛ این مقادیر مستقیماً در `src/lib/db.js` برای ساخت connection pool استفاده می‌شوند.
- `JWT_SECRET` و `JWT_REFRESH_SECRET` باید مقادیر تصادفی و طولانی و متفاوت از یکدیگر باشند.
- `NESHAN_API_KEY` در صورت نیاز به فراخوانی سرویس‌های نشان از سمت سرور استفاده می‌شود.
- انتخاب درگاه پرداخت از طریق `PAYMENT_PROVIDER` انجام می‌شود؛ برای افزودن درگاه واقعی، یک کلاس جدید که از `PaymentProvider` (در `src/payments/PaymentProvider.js`) ارث‌بری می‌کند بسازید و آن را در `src/payments/index.js` ثبت کنید — هیچ تغییری در ماژول‌های `orders` یا `accounting` لازم نیست.
- به همین ترتیب، ارسال پیامک کد تایید از طریق `SMS_PROVIDER` انتخاب می‌شود؛ برای اتصال یک سرویس واقعی، کلاسی از `SmsProvider` (در `src/sms/SmsProvider.js`) بسازید و در `src/sms/index.js` ثبت کنید.

### پنل کامل حساب کاربری مشتری

علاوه بر سفارش‌ها و پروفایل پایه، پنل مشتری (`frontend/src/pages/customer/`) شامل این بخش‌هاست: آپلود آواتار و تایید شماره موبایل با OTP، تغییر رمز عبور، مدیریت نشست‌های فعال (خروج از دستگاه‌های دیگر)، آدرس‌های ذخیره‌شده، فیلتر و جزئیات سفارش با پیگیری لحظه‌ای وضعیت (Socket.IO)، سفارش مجدد، دریافت فاکتور PDF، کیف پول و تاریخچه امتیاز وفاداری، اعتبارسنجی و استفاده از کد تخفیف در پرداخت، مجموعه‌ها و آیتم‌های موردعلاقه، بازدیدهای اخیر، ثبت/ویرایش/حذف نظر، مرکز اعلان درون‌برنامه‌ای با تنظیمات هر دسته، ثبت تیکت پشتیبانی، و خروجی گرفتن از داده‌ها یا حذف حساب (مطابق اصول GDPR). ماژول‌های بک‌اند متناظر (`loyalty`, `coupons`, `favorites`, `reviews`, `notifications`, `support`) مستقل و قابل توسعه هستند.

### پنل کامل مدیریت مجموعه

پنل مجموعه (`frontend/src/pages/venue/`) برای مالک دسترسی کامل و برای کارمند دسترسی محدود بر اساس مجوزهای اعطاشده دارد:

- **داشبورد**: آمار امروز (تعداد سفارش، فروش، سفارش‌های فعال، میانگین ارزش سفارش)، نمودار روند فروش ۷/۳۰ روز اخیر، پرفروش‌ترین آیتم‌ها، ساعات پرترافیک، و فید زنده سفارش‌ها با هشدار صوتی اختیاری (Socket.IO).
- **منو**: برچسب، بازه زمانی نمایش (مثلاً فقط صبحانه)، متغیر/افزودنی (اندازه، تاپینگ) با تنظیم قیمت، عملیات دسته‌جمعی (فعال/غیرفعال‌سازی، تغییر قیمت گروهی)، و کمبو/بسته تخفیفی قابل سفارش توسط مشتری.
- **میزها و QR**: افزودن/ویرایش/حذف میز، مشاهده وضعیت «فعال» میز (سفارش باز و پرداخت‌نشده)، دانلود کد QR اختصاصی هر میز (`GET /api/venues/:id/tables/:tableId/qrcode.png`، تولیدشده با پکیج `qrcode`).
- **سفارش‌ها**: صف زنده گروه‌بندی‌شده بر اساس وضعیت (`PENDING → PREPARING → READY → SERVED`)، ویرایش دستی اقلام/تخفیف پیش از پرداخت با ثبت در تاریخچه فعالیت، و لغو/استرداد سفارش با ثبت دلیل (بازگشت خودکار امتیاز وفاداری کسب‌شده).
- **حسابداری**: گزارش فروش با خروجی CSV/PDF، تفکیک درآمد بر اساس دسته/آیتم، محاسبه شفاف کارمزد و درآمد خالص، ثبت هزینه، و تاریخچه تسویه‌حساب (Payout) با وضعیت در انتظار/پرداخت‌شده.
- **کارمندان**: افزودن/حذف کارمند و تخصیص مجوزهای دقیق (`orders.view`, `orders.manage`, `menu.manage`, `accounting.view`, `staff.manage`, `settings.manage`, `marketing.manage`, `feedback.manage`) از طریق جدول `StaffPermission`؛ مالک همیشه دسترسی کامل دارد.
- **بازخورد**: مشاهده نظرات و امتیازها، پاسخ عمومی به نظر، و روند میانگین امتیاز به تفکیک ماه.
- **تنظیمات**: پروفایل، لوگو/تصویر کاور، نوع مجموعه، ساعات کاری، مختصات جغرافیایی (ورودی عددی + پیش‌نمایش نقشه ثابت نشان)، مشاهده پلن و ارسال درخواست ارتقا/تنزل پلن، و تنظیمات اعلان (سفارش جدید، نظر با امتیاز پایین).
- **بازاریابی**: ساخت کد تخفیف مخصوص مجموعه و ارسال اعلان تبلیغاتی به مشتریانی که این مجموعه را موردعلاقه کرده‌اند یا قبلاً از آن خرید کرده‌اند.

تمام مسیرهای نوشتنی این پنل از میان‌افزار `requireVenuePermission` (در `src/middleware/venuePermission.js`) عبور می‌کنند: مالک و مدیر کل همیشه مجازند، کارمند فقط در صورت داشتن مجوز مربوطه در جدول `StaffPermission`.
- `CORS_ORIGIN` و `SOCKET_CORS_ORIGIN` باید با آدرس فرانت‌اند در حال اجرا مطابقت داشته باشند.

---

## معماری احراز هویت و دسترسی (RBAC)

سیستم احراز هویت واحد بر پایه JWT با ۴ نقش کاربری:

- `CUSTOMER` — امکان سفارش مهمان (بدون ورود) یا با حساب کاربری برای دسترسی به تاریخچه، تخفیف و امتیاز وفاداری
- `VENUE_STAFF` — دسترسی محدود به مجموعه خود (بر اساس `venueId`)
- `VENUE_OWNER` — دسترسی کامل به پنل مجموعه خود
- `SUPER_ADMIN` — دسترسی کامل به تمام پلتفرم

Access token کوتاه‌مدت (۱۵ دقیقه) در حافظه فرانت‌اند نگه‌داری می‌شود و refresh token بلندمدت (۷ روز) در کوکی httpOnly ذخیره می‌شود. کارمزد هر مجموعه (۱۰٪/۵٪/۱٪) بر اساس پلن اشتراک (`FREE`/`PRO`/`ULTRA`) به‌صورت خودکار محاسبه و در گزارش‌های حسابداری اعمال می‌شود.
