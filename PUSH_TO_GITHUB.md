# Push this repo to your GitHub (one-time)

The project is ready locally at:

`/home/dagim/Desktop/cafe-audit-system`

GitHub CLI is installed at `~/.local/bin/gh` but **you are not logged in yet**. Complete these steps in a terminal:

```bash
export PATH="$HOME/.local/bin:$PATH"
cd ~/Desktop/cafe-audit-system

# 1) Log in (opens a browser / device code)
gh auth login -h github.com -p https -w

# 2) Create public repo and push
gh repo create cafe-audit-system --public --source=. --remote=origin --push

# If the name is taken:
# gh repo create cafe-audit-system-v2 --public --source=. --remote=origin --push
```

After push, your URL will look like:

`https://github.com/YOUR_USERNAME/cafe-audit-system`

## Then get an online HTTPS URL (Railway)

1. https://railway.app → New Project → Deploy from GitHub → select `cafe-audit-system`
2. Add **MySQL** plugin/service
3. Web service Dockerfile: `deployment/cloud/Dockerfile` (build context = repo root)
4. Set env: `APP_URL`, `V2_DB_HOST`, `V2_DB_PORT`, `V2_DB_NAME`, `V2_DB_USER`, `V2_DB_PASS`
5. Open `https://YOUR-APP.up.railway.app/login` → manager / admin123

**Vercel cannot host this app** (needs PHP + MySQL + file uploads).
