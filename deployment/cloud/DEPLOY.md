# Deployment guide — Cafe Audit System

This app is **PHP 8 + Apache + MySQL** with server-side sessions and file uploads. It is designed for a **local network (LAN)** thesis demo. Cloud deployment is optional and uses Docker.

Application source lives in **`V2/`**. Docker and cloud configs live in **`deployment/cloud/`** (this folder).

---

## Why not Vercel?

| Requirement | This app | Vercel |
|-------------|----------|--------|
| PHP runtime | Yes (MVC, sessions) | No native PHP |
| MySQL | Required | Not included |
| File uploads | `storage/uploads/payments/` | Ephemeral filesystem |
| Long-lived sessions | Yes | Serverless / stateless |

**Vercel** targets static sites and serverless Node/Edge functions. **GitHub Pages** is static-only and cannot run PHP or MySQL.

**Good fits:** GitHub (source code) + **Railway**, **Render**, or **Fly.io** (Docker + managed MySQL).

---

## Recommended setup for thesis defense

| Goal | Recommendation |
|------|----------------|
| Live demo during defense | **XAMPP on your laptop** (most reliable; matches LAN scope) |
| On-premise LAN server | **Raspberry Pi 3 B+** — see `../raspberry-pi/README.md` |
| Code submission / portfolio | **GitHub private or public repo** |
| Optional online demo | **Railway** or **Render** (Docker + MySQL) |

For the defense presentation, keep XAMPP or a Pi on cafe Wi‑Fi as the primary demo. Use cloud only as a backup or portfolio link.

---

## Environment variables

Copy `.env.example` to `.env` in this folder and adjust values. The app reads these via `getenv()` in `V2/config/app.php` and `V2/config/database.php`:

| Variable | Purpose |
|----------|---------|
| `APP_URL` | Public base URL (no trailing slash); used for links and QR codes |
| `V2_DB_HOST` | MySQL hostname |
| `V2_DB_PORT` | MySQL port (usually `3306`) |
| `V2_DB_NAME` | Database name (`restaurant_v2`) |
| `V2_DB_USER` | MySQL user |
| `V2_DB_PASS` | MySQL password |

**PHP extensions required:** `pdo_mysql`, `gd` (QR codes). **Writable:** `V2/storage/uploads/`.

---

## Local Docker test (production-like)

From **`deployment/cloud/`**:

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:8080` (or the port in `WEB_PORT`).

The compose file builds from the **repository root**: application files are copied from `V2/`, and `docker-entrypoint.sh` from this folder.

**Initialize the database once:**

Local Docker now **auto-runs** `php database/bootstrap.php` on first start when the DB is empty.

Manual fallback:

```bash
docker compose exec web php database/bootstrap.php
```

Or classic:

```bash
docker compose exec -T db mysql -uroot -p"rootpassword" < ../../V2/database/schema.sql
docker compose exec -T db mysql -uroot -p"rootpassword" restaurant_v2 < ../../V2/database/seed.sql
docker compose exec web php database/install.php
```

Use the root password from your `.env` (`MYSQL_ROOT_PASSWORD`). Demo logins: see root `README.md` (password `admin123`).

Set `APP_URL=http://localhost:8080` in `.env` before generating QR codes or payment links.

---

## Push code to GitHub

1. Create a new repository on GitHub (e.g. `cafe-audit-system`).
2. From your machine, at the repository root:

   ```bash
   git init
   git add .
   git commit -m "Cafe Audit System V2"
   git branch -M main
   git remote add origin https://github.com/YOUR_USER/cafe-audit-system.git
   git push -u origin main
   ```

3. Do **not** commit `.env` (it is in `deployment/cloud/.gitignore`). Use `.env.example` for documentation.
4. For thesis submission, a **private repo** shared with your advisor is fine; mention the repo URL in your report.

---

## Deploy on Railway

1. Sign in at [railway.app](https://railway.app) and **New Project → Deploy from GitHub repo**.
2. Set **Dockerfile path** to `deployment/cloud/Dockerfile` and **build context** to the repository root (so `V2/` and `deployment/cloud/` are both available).
3. **Add MySQL:** New → Database → MySQL. Note the connection variables.
4. On the **web service**, set environment variables:
   - `APP_URL` = your Railway public URL (e.g. `https://cafe-audit-production.up.railway.app`)
   - `V2_DB_HOST`, `V2_DB_PORT`, `V2_DB_NAME`, `V2_DB_USER`, `V2_DB_PASS` from the MySQL service
5. **Initialize database** (Railway MySQL → Connect → use CLI or a GUI):
   - Import `V2/database/schema.sql` and `V2/database/seed.sql`
   - Run `php database/install.php` via Railway shell on the web service, or one-off job
6. Redeploy if needed. Test login and file upload (payment screenshot).

**Note:** Ephemeral disks on some plans may not persist uploads across redeploys; for thesis scope, LAN/XAMPP avoids this. For cloud, consider object storage as future work.

---

## Deploy on Render

1. Sign in at [render.com](https://render.com) and connect GitHub.
2. **Blueprint:** Use **New → Blueprint** and point at `deployment/cloud/render.yaml` in the repo.
3. Or manually: **New → Web Service**, runtime **Docker**, Dockerfile `deployment/cloud/Dockerfile`, context = repository root.
4. **New → PostgreSQL is wrong** — use **MySQL** (or external MySQL). Create a MySQL instance and link env vars:
   - `V2_DB_HOST`, `V2_DB_PORT`, `V2_DB_NAME`, `V2_DB_USER`, `V2_DB_PASS`
   - `APP_URL` = `https://YOUR_SERVICE.onrender.com`
5. Import `V2/database/schema.sql` / `V2/database/seed.sql`, then run `php database/install.php` (Render Shell).
6. Free tier may spin down when idle; fine for portfolio, less ideal for live defense.

See `render.yaml` in this folder for a starter blueprint.

---

## Post-deploy checklist

- [ ] `APP_URL` matches the live HTTPS URL
- [ ] Schema + seed imported; `install.php` run
- [ ] Login works (demo users from `V2/README.md`)
- [ ] QR / customer menu loads with correct host
- [ ] Payment upload saves under `storage/uploads/payments/`
- [ ] Apache rewrite works (routes not 404)

---

## Thesis defense talking points

**What you built:** LAN cafe operations system — inventory audit, sales, kitchen workflow, billing, mobile payment verification.

**Why local-first:** Matches real cafe deployment (on-premise server), no internet dependency during service, data stays on site.

**Future work (if asked):**

- Cloud object storage (S3/R2) for payment proofs
- HTTPS and role-based hardening for WAN access
- Mobile app or PWA for waiters
- Multi-branch / centralized reporting
- Automated backups and audit log export

---

## Quick comparison

| Platform | Use for this project |
|----------|----------------------|
| **XAMPP / LAN** | Primary defense demo |
| **Raspberry Pi** | Low-cost on-premise cafe server |
| **GitHub** | Source control + submission |
| **Railway / Render / Fly.io** | Optional Docker + MySQL hosting |
| **Vercel / GitHub Pages** | Not suitable (no PHP + MySQL) |

Unity University — Cafe Audit System
