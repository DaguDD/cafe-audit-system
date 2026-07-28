# Cafe Audit System — Vercel (Next.js) app

This folder is the **online** version for [Vercel](https://vercel.com).

## Local setup

```bash
cp .env.example .env.local
# set AUTH_SECRET (openssl rand -base64 32)

docker compose up -d   # Postgres
npm install
npx prisma db push
npm run seed
npm run dev
```

Open http://localhost:3000/login — **manager** / **admin123**

## Vercel

1. Import GitHub repo → Root Directory = `web`
2. Add **Vercel Postgres** + env `DATABASE_URL`
3. Add env: `AUTH_SECRET`, `AUTH_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`
4. Add **Vercel Blob** → `BLOB_READ_WRITE_TOKEN` (payment screenshots)
5. After deploy: `npx prisma db push && npm run seed` against that `DATABASE_URL`

See root `README.md` for full steps.
