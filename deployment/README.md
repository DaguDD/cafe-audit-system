# Deployment options — Cafe Audit System

This folder contains **optional** deployment guides for the application in `V2/`. The app itself stays in `V2/`; these folders only describe how to run it in different environments.

| Folder | Use when |
|--------|----------|
| **[`../cafe-audit-pi-bundle/`](../cafe-audit-pi-bundle/)** | **Thesis / examiner demo (recommended)** — self-contained Pi package for **Ubuntu Server 24.04** on Pi 3 B+. Includes full app, install scripts, examiner handouts. Copy one folder to the Pi. |
| **[cloud/](cloud/)** | Docker Compose on a developer machine, or hosted platforms (Railway, Render) with managed MySQL. Good for portfolio links and production-like testing. |
| **[raspberry-pi/](raspberry-pi/)** | Older scripts that expect repo `V2/` beside `deployment/` (Bookworm notes). Prefer `cafe-audit-pi-bundle/` for Ubuntu 24.04. |

**Primary defense demo:** Pi on cafe Wi‑Fi with examiners on the same network, or XAMPP on a laptop as backup.

See `V2/README.md` for application setup and demo logins.
