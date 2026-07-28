# Your live Vercel app (already set up)

## Open this

**Login:** https://cafe-audit-system.vercel.app/login  

| Username | Password |
|----------|----------|
| manager | admin123 |
| auditor | admin123 |
| waiter1 | admin123 |
| cashier1 | admin123 |
| kitchen1 | admin123 |
| admin | admin123 |

Dashboard: https://cafe-audit-system.vercel.app/dashboard  

---

## Why you couldn’t add Storage while creating the project

That’s normal. Vercel order is:

1. **Create / import the project first**
2. **Then** add Storage (Postgres / Blob) **after** the project exists  

You don’t add storage on the “New Project” screen.

---

## What was already done for you

| Step | Status | Where |
|------|--------|--------|
| GitHub repo | Done | https://github.com/DaguDD/cafe-audit-system |
| Vercel project | Done | `cafe-audit-system` (Root Directory = `web`) |
| Neon Postgres | Done | Storage → cafe-audit-db |
| Blob store | Done | Storage → cafe-audit-blob |
| Auth / cafe env vars | Done | Project → Settings → Environment Variables |
| Database tables + demo users | Done | `prisma db push` + `seed` |
| Production deploy | Done | https://cafe-audit-system.vercel.app |

Code for Vercel is only in the **`web/`** folder.  
PHP local version stays in **`V2/`** (not used by Vercel).

---

## If you change code later

```bash
cd ~/Desktop/cafe-audit-system
git add -A && git commit -m "update" && git push
# then either auto-deploy from GitHub, or:
vercel deploy --prod --yes
```

---

## Dashboard links

- Project: https://vercel.com/dagudds-projects/cafe-audit-system  
- Neon storage: open **Storage** tab on that project  
