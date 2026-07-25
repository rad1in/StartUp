[🇮🇷 فارسی را بخوانید](README.fa.md)

# QR / Location-Based Restaurant & Cafe Ordering Platform

A platform for restaurants and cafes that replaces the traditional "scan the menu → wait for a waiter → order" flow with a fully self-service experience. Customers reach a venue's menu either by location detection or by scanning the QR code on their table, then order and pay directly from their phone.

This repository contains three independent projects:

- `/backend` — Express + mysql2 (raw SQL, no ORM) + MySQL + Socket.IO
- `/frontend` — React + Vite + Tailwind CSS (multilingual: Persian/English/Arabic/Turkish, Vazirmatn font)
- `/mobile` — React Native + Expo Router (customer, venue-owner, and platform-admin apps in one)

---

## 1. Getting Started (full local setup)

### Prerequisites

- Node.js 18+ (LTS)
- MySQL 8+ (an empty database, e.g. `qr_ordering`)
- npm (bundled with Node)

### Setup from scratch

```bash
# 1. Clone the repository
git clone <repo-url>
cd StartUp

# 2. Configure backend environment variables
cd backend
cp .env.example .env
# Edit DB_HOST/DB_USER/DB_PASSWORD/DB_NAME and the JWT secrets in .env
# The MySQL database (e.g. qr_ordering) must already exist on your MySQL server

# 3. Install dependencies, run migrations and seed
npm install
npm run db:migrate
npm run db:seed

# 4. Run the backend server (in this terminal)
npm run dev
```

```bash
# 5. In a new terminal — configure and run the frontend
cd frontend
cp .env.example .env
# Edit VITE_API_URL and VITE_NESHAN_API_KEY if needed

npm install
npm run dev
```

```bash
# 6. (Optional) Mobile app
cd mobile
cp .env.example .env
npm install
npm start
```

Once both services are running:
- Backend on `http://localhost:5000`
- Frontend on `http://localhost:5173`

Seed data includes these accounts (all passwords: `Password123!`):

| Role | Email |
|---|---|
| Platform super admin (`SUPER_ADMIN`) | `admin@platform.local` |
| Venue owner (`VENUE_OWNER`) | `owner@demo-cafe.local` |
| Venue staff (`VENUE_STAFF`) | `staff@demo-cafe.local` |
| Sample customer (`CUSTOMER`) | `customer@demo.local` |

Sample table QR token: `demo-qr-token-0001` (testable via the "Scan QR" button on the home page).

### Environment variables

All three projects ship a fully documented `.env.example` file (`backend/.env.example`, `frontend/.env.example`, `mobile/.env.example`) — see those files for the complete list of variables and what each one does.

---

## 2. Frontend

### Development commands

```bash
cd frontend
npm install
npm run dev        # Vite dev server on port 5173
npm run build       # Production build into dist/
npm run preview     # Preview the production build
```

### Required configuration

- `VITE_API_URL` must point at the running backend.
- `VITE_NESHAN_API_KEY` is required to render the map and markers (see the [Neshan docs](https://platform.neshan.org/docs/)).
- The Vazirmatn font is loaded via the `@fontsource/vazirmatn` package.
- Page language and text direction (RTL/LTR) switch dynamically based on the user's chosen language (Persian/Arabic are RTL; English/Turkish are LTR).

---

## 3. Backend

### Development commands

```bash
cd backend
npm install
npm run dev          # nodemon server on port 5000
```

### Database (raw mysql2 — no ORM)

No ORM is used; MySQL is accessed directly through a connection pool from `mysql2/promise`, with raw, parameterized SQL queries written per module.

```bash
npm run db:migrate    # Run versioned migrations against the database
npm run db:seed        # Populate the database with sample data (dev only)
```

> Note: the database named in `DB_NAME` must already exist in MySQL (e.g. via `CREATE DATABASE qr_ordering;`) — the migration script only creates tables, not the database itself.

### Running in production

```bash
cd backend
npm install --production
npm run db:migrate
npm start
```

### Preparing for public launch

```bash
npm run go-live   # One-time, single-use: wipes demo data + creates the real admin account
```

---

## 4. Mobile

The mobile app (React Native + Expo Router, SDK 54) bundles three role-based experiences: customer (QR scan, ordering, wallet, loyalty), venue owner (live orders, menu, settings, marketing), and platform admin.

```bash
cd mobile
npm install
npm start          # Starts the Expo dev server — scan with Expo Go or a simulator
```

Post-release JS-only fixes ship via EAS Update without a new store submission:

```bash
npm run update:production
```

---

## Auth & access-control architecture (RBAC)

A single JWT-based auth system with 4 roles:

- `CUSTOMER` — can order as a guest (no login) or with an account for order history, discounts, and loyalty points
- `VENUE_STAFF` — scoped access to their own venue (by `venueId`)
- `VENUE_OWNER` — full access to their own venue's panel
- `SUPER_ADMIN` — full access to the entire platform

A short-lived access token is kept in frontend memory; a long-lived refresh token is stored in an httpOnly cookie. Each venue's platform fee (based on its subscription tier — `FREE`/`PRO`/`ULTRA`) is calculated automatically and reflected in accounting reports.

---

## Infrastructure & monitoring

- **CI**: every push/PR to `main` runs backend tests (against a real MySQL service), a frontend build, and a mobile config check (`.github/workflows/ci.yml`).
- **Error monitoring (Sentry)**: wired into all three projects; only activates once `SENTRY_DSN` is set in `.env`.
- **Mobile OTA updates**: via EAS Update.
