# FOMO COFFEE POS

Sistem Point of Sales modern untuk coffee shop dengan fitur POS kasir, kitchen display, inventory, supplier, customer, promo, laporan, audit log, landing page publik, dan role-based access control.

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS
- Backend: Hono
- API: tRPC
- ORM: Drizzle
- Database: MySQL 8
- Auth: username/password lokal + session cookie

## Prasyarat

Install:

- Node.js 20+
- MySQL 8 atau MariaDB
- npm

XAMPP tidak wajib. Yang wajib hanya MySQL/MariaDB.

## Setup Cepat

Masuk ke folder project:

```bash
cd D:\fomo-coffee
```

Install dependency:

```bash
npm install
```

Buat database MySQL:

```sql
CREATE DATABASE fomo_coffee;
```

Buat file `.env` dari contoh:

```powershell
Copy-Item .env.example .env
```

Isi `.env`:

```env
DATABASE_URL=mysql://root:@localhost:3306/fomo_coffee
SESSION_SECRET=fomo-coffee-local-development-secret
```

Jika MySQL memakai password:

```env
DATABASE_URL=mysql://root:password_kamu@localhost:3306/fomo_coffee
```

Push schema database:

```bash
npm run db:push
```

Isi data demo:

```bash
npx tsx db/seed.ts
```

Jalankan aplikasi:

```bash
npm run dev
```

Buka:

```text
http://localhost:3000
```

## Akun Demo

| Role  | Username  | Password     |
| ----- | --------- | ------------ |
| Owner | `owner`   | `owner123`   |
| Admin | `admin`   | `admin123`   |
| Kasir | `cashier` | `cashier123` |

Owner dapat mengakses pengaturan sistem, audit log, dan seluruh menu. Admin mengelola operasional. Kasir fokus pada POS, kitchen, transaksi, dan shift.

## Halaman Utama

- `/` landing page publik + SEO
- `/login` login lokal
- `/forgot-password` reset password
- `/dashboard` dashboard POS
- `/pos` POS kasir
- `/kitchen` kitchen display
- `/products` produk
- `/categories` kategori
- `/inventory` inventory
- `/suppliers` supplier
- `/customers` customer
- `/membership` membership
- `/promos` promo
- `/purchase-orders` purchase order
- `/receiving` receiving barang
- `/transactions` transaksi
- `/shifts` shift kasir
- `/reports` laporan
- `/audit` audit log
- `/users` user management
- `/notifications` notification center
- `/settings` pengaturan owner
- `/profile` profil user
- `/contact`, `/support`, `/fax`, `/privacy`, `/terms` halaman publik footer

## Command Penting

```bash
npm run dev       # development server
npm run lint      # lint
npm run check     # TypeScript check
npm test          # test/CI smoke check
npm run build     # production build
npm run start     # start production server dari dist
npm run db:push   # push schema ke database
```

## Deploy Railway

Set environment variable berikut di Railway:

```env
NODE_ENV=production
DATABASE_URL=mysql://user:password@host:port/database
SESSION_SECRET=isi-dengan-secret-panjang-random
```

Build command:

```bash
npm run build
```

Start command:

```bash
npm run start
```

Setelah database Railway siap, jalankan `npm run db:push` satu kali untuk membuat/memperbarui tabel, lalu jalankan `npx tsx db/seed.ts` jika butuh data demo.

## Troubleshooting

Jika `DATABASE_URL is required`, pastikan file `.env` ada dan berisi `DATABASE_URL`.

Jika gagal konek database, cek MySQL sudah running, database `fomo_coffee` sudah dibuat, dan username/password benar.

Jika port `3000` sudah dipakai, hentikan aplikasi lain atau ubah port di `vite.config.ts`.

Jika login gagal, jalankan ulang seed:

```bash
npx tsx db/seed.ts
```

## Status Validasi

Project divalidasi dengan:

```bash
npm run lint
npm run check
npm run build
```

Catatan sisa minor:

1. OTP masih membutuhkan provider email/SMS/Authenticator sebelum bisa diaktifkan sebagai verifikasi login produksi.
2. Cash drawer dan thermal printer butuh driver/vendor bridge terminal fisik.
3. WhatsApp masih memakai shortcut `wa.me`; integrasi resmi membutuhkan kredensial WhatsApp Business API.
