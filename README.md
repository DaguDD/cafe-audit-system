# Cafe Audit System

Two ways to run the same product:

| Path | Stack | Who it's for |
|------|--------|--------------|
| **`web/`** | Next.js + PostgreSQL + Vercel Blob | **Online on Vercel** (public HTTPS URL) |
| **`V2/`** | PHP + Apache + MySQL | **Local / LAN** (XAMPP, Raspberry Pi, Docker) |

---

## A) Deploy online on Vercel (`web/`)

### 1. Connect GitHub → Vercel
1. Push this repo to GitHub.
2. [vercel.com](https://vercel.com) → **Add New Project** → import `cafe-audit-system`.
3. Set **Root Directory** to `web`.
4. Framework: Next.js (auto).

### 2. Add Postgres
1. Vercel dashboard → **Storage** → create **Postgres** (Neon).
2. Connect it to the project (sets `DATABASE_URL` automatically).

### 3. Environment variables
In Vercel → Project → Settings → Environment Variables:

| Name | Value |
|------|--------|
| `DATABASE_URL` | from Vercel Postgres |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://YOUR-APP.vercel.app` |
| `NEXTAUTH_URL` | same as `AUTH_URL` |
| `NEXT_PUBLIC_APP_URL` | same as `AUTH_URL` |
| `BLOB_READ_WRITE_TOKEN` | from Vercel Blob store (for payment screenshots) |
| `NEXT_PUBLIC_CAFE_NAME` | Unity Cafe |
| `VARIANCE_THRESHOLD_PCT` | 10 |

### 4. First database setup
After first deploy, run once (Vercel → Storage → Postgres → Query, or local against prod URL):

```bash
cd web
npx prisma db push
npm run seed
```

Or from your laptop with `DATABASE_URL` pointing at the Vercel Postgres URL.

### 5. Login
Open `https://YOUR-APP.vercel.app/login` → **manager** / **admin123**

---

## B) Local Next.js development

```bash
cd web
cp .env.example .env.local
# edit AUTH_SECRET
docker compose up -d          # Postgres on :5432
npm install
npx prisma db push
npm run seed
npm run dev
```

Open http://localhost:3000/login

---

## C) Local PHP (original thesis / cafe LAN)

```bash
cd deployment/cloud
cp .env.example .env
docker compose up --build
```

Open http://localhost:8080/login  

Or use XAMPP / Raspberry Pi — see `deployment/cloud/DEPLOY.md` and `V2/README.md`.

---

## Demo accounts (both stacks)

Password for all: **`admin123`**

| Username | Role |
|----------|------|
| manager | Manager |
| auditor | Auditor |
| waiter1 | Waiter |
| cashier1 | Cashier |
| kitchen1 | Kitchen |
| admin | Admin |

---

## Features in the Vercel (`web`) app

- Role-based staff login (JWT sessions via Auth.js)
- Dashboard KPIs
- Inventory + low-stock
- Products & recipes
- Stock audit with **10% variance** flags
- Tables + QR codes → customer menu
- Kitchen display
- Counter sales with recipe deduction
- Payment proof upload (Vercel Blob) + approve/reject

The PHP `V2/` app remains the full thesis LAN implementation for offline cafe Wi‑Fi demos.
