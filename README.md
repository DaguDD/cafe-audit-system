# Cafe Audit System

Web app for cafe inventory audit, recipe-based stock control, table QR ordering, kitchen display, and mobile payment verification.

**Stack:** PHP 8 · Apache · MySQL/MariaDB · Bootstrap 5  
**Thesis / LAN demo:** XAMPP or Raspberry Pi  
**Online public URL:** Railway or Render (Docker) — **not Vercel**

---

## Why not Vercel (or GitHub Pages)?

| Need | This app | Vercel / GitHub Pages |
|------|----------|------------------------|
| PHP + sessions | Yes | No native PHP runtime |
| MySQL | Required | Not included |
| File uploads (payment screenshots) | Persistent disk | Ephemeral / static only |

Vercel is for static sites and serverless Node/Edge. This is a classic **LAMP** app. For a **public HTTPS URL**, use **Railway** or **Render** with Docker + MySQL.

---

## Quick start — local Docker (one command)

```bash
cd deployment/cloud
cp .env.example .env
docker compose up --build
```

Open **http://localhost:8080/login**

On first boot the container **auto-creates** schema, seed data, and demo users (`database/bootstrap.php`).

| Username | Password | Role |
|----------|----------|------|
| manager | admin123 | Manager |
| auditor | admin123 | Auditor |
| waiter1 | admin123 | Waiter |
| cashier1 | admin123 | Cashier |
| kitchen1 | admin123 | Kitchen |
| admin | admin123 | Admin |

---

## Deploy online — get a public URL

### Option A — Railway (recommended)

1. Push this repo to GitHub (see below).
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Add a **MySQL** database service to the same project.
4. On the **web** service:
   - **Settings → Build:** Dockerfile path = `deployment/cloud/Dockerfile`, root directory / context = repo root
   - **Variables** (link from MySQL where possible):

     | Variable | Value |
     |----------|--------|
     | `APP_URL` | Your public Railway URL, e.g. `https://cafe-audit-production.up.railway.app` (no trailing slash) |
     | `V2_DB_HOST` | MySQL host from Railway |
     | `V2_DB_PORT` | `3306` (or Railway port) |
     | `V2_DB_NAME` | MySQL database name |
     | `V2_DB_USER` | MySQL user |
     | `V2_DB_PASS` | MySQL password |

5. Deploy. First start runs auto-bootstrap. If the DB was empty and bootstrap was skipped, open Railway shell on the web service and run:

   ```bash
   php database/bootstrap.php
   ```

6. Visit `https://YOUR-APP.up.railway.app/login` → `manager` / `admin123`

**Important:** Set `APP_URL` to the real HTTPS URL so QR codes and payment links work.

### Option B — Render

1. [render.com](https://render.com) → **New → Blueprint** → select this repo → use `deployment/cloud/render.yaml`  
   **or** New → Web Service → Docker → Dockerfile `deployment/cloud/Dockerfile`, context = repository root.
2. Create a **MySQL** instance (not Postgres) and wire env vars the same as Railway (`APP_URL`, `V2_DB_*`).
3. After first deploy, set `APP_URL=https://YOUR-SERVICE.onrender.com` and redeploy.
4. If needed: **Shell** → `php database/bootstrap.php`

Free Render web services may sleep when idle; fine for a portfolio link.

### Option C — LAN / thesis defense (no cloud)

- **XAMPP:** copy `V2/` to `htdocs`, import `database/schema.sql` + `seed.sql`, run `php database/install.php`
- **Raspberry Pi:** see `deployment/raspberry-pi/` or the separate Pi bundle in your Final Project folder

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `APP_URL` | Public base URL (no trailing slash) — QR & payment links |
| `V2_DB_HOST` | MySQL hostname |
| `V2_DB_PORT` | MySQL port (default `3306`) |
| `V2_DB_NAME` | Database name (`restaurant_v2`) |
| `V2_DB_USER` | MySQL user |
| `V2_DB_PASS` | MySQL password |

Copy `deployment/cloud/.env.example` → `deployment/cloud/.env` for local Docker. **Never commit `.env`.**

---

## Project layout

```text
V2/                     Application (PHP MVC)
  public/               Web root (index.php, assets, customer menu)
  app/                  Controllers, models, views
  config/               app.php, database.php
  database/             schema, seed, bootstrap.php, install.php
deployment/cloud/       Dockerfile, compose, Railway/Render notes
deployment/raspberry-pi/ Optional on-premise Pi scripts
docs/                   Schema notes and defense helpers
```

---

## Manual DB bootstrap (any host)

```bash
# Inside the web container / shell, with V2_DB_* set:
php database/bootstrap.php
```

Or classic:

```bash
mysql -u root < V2/database/schema.sql
mysql -u root restaurant_v2 < V2/database/seed.sql
php V2/database/install.php
```

---

## Docs

- `deployment/cloud/DEPLOY.md` — detailed cloud notes
- `V2/SYSTEM_OVERVIEW.md` — architecture
- `V2/docs/DATABASE_SCHEMA.md` — ERD summary
- `docs/` — extra guides copied for defense / examiners

---

## License / academic use

Built as a Unity University final-year project (Cafe Audit System). Demo credentials above are for evaluation only — change passwords before any real cafe use.
