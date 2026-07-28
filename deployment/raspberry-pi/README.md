# Cafe Audit System — Raspberry Pi 3 B+ Deployment

Step-by-step guide to run the **V2** application on a **Raspberry Pi 3 Model B+** (1 GB RAM) with **Raspberry Pi OS Bookworm** (64-bit recommended). Uses native **Apache + MariaDB + PHP 8.2** — no Docker.

---

## Why a Raspberry Pi for this thesis?

| Reason | Explanation |
|--------|-------------|
| **On-premise cafe server** | Real cafes often run a small PC or appliance on the LAN, not a cloud SaaS product. A Pi demonstrates that choice. |
| **Low cost** | Pi 3 B+ (~$35–45) is affordable for student projects and small businesses. |
| **LAN demo narrative** | Teachers and examiners connect phones to the **same Wi‑Fi**, scan a table QR code, and order — no internet required. |
| **Matches system design** | The app is built for Apache, PHP, MySQL/MariaDB, and local sessions — exactly what the Pi provides. |

This is **optional**. XAMPP on a laptop remains the simplest defense backup. The Pi is the “production-like” story.

---

## What you need

- Raspberry Pi 3 B+ with power supply and microSD card (16 GB+)
- Raspberry Pi OS **Bookworm** (Desktop or Lite)
- Ethernet cable or cafe Wi‑Fi access
- A laptop to flash the SD card and copy `V2/` (USB, `scp`, or git clone)
- Files in this folder: `install.sh`, `setup-db.sh`, `apache/cafe-audit.conf`, `env.example`

---

## Step 1 — Flash Raspberry Pi OS

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/).
2. Choose **Raspberry Pi OS (64-bit)** — Bookworm.
3. Click the gear icon (OS customization):
   - Set hostname: `cafe-audit` (optional)
   - Enable **SSH** with password authentication
   - Set username/password (e.g. `pi` / your password)
   - Configure **Wi‑Fi** SSID and password if you will not use Ethernet
4. Flash to the microSD card, insert into the Pi, boot.

---

## Step 2 — First boot and SSH

Find the Pi IP address:

- Router admin page, or
- `ping cafe-audit.local`, or
- `nmap -sn 192.168.1.0/24` from your laptop

SSH in:

```bash
ssh pi@192.168.1.50
```

Update the system:

```bash
sudo apt update && sudo apt full-upgrade -y
sudo reboot
```

---

## Step 3 — Static IP on cafe Wi‑Fi (recommended for demo)

A stable IP keeps QR codes and bookmarks working.

**Option A — DHCP reservation** (easiest): In the router, reserve `192.168.1.50` for the Pi’s MAC address.

**Option B — Static IP on the Pi** (Bookworm, NetworkManager):

Edit `/etc/dhcpcd.conf` or use `nmtui` / `raspi-config` depending on your image. Example static config:

```text
IP:      192.168.1.50
Gateway: 192.168.1.1
DNS:     192.168.1.1
```

**Local hostname (optional):** On examiner laptops, add to `/etc/hosts` (or `C:\Windows\System32\drivers\etc\hosts`):

```text
192.168.1.50  cafe-audit.local
```

Then use `http://cafe-audit.local` as `APP_URL`.

---

## Step 4 — Copy application source

On your development machine, copy the whole repo or at least `V2/` and `deployment/raspberry-pi/`:

```bash
scp -r V2 deployment/raspberry-pi pi@192.168.1.50:~/
```

Or clone from GitHub on the Pi:

```bash
git clone https://github.com/YOUR_USER/cafe-audit-system.git
cd cafe-audit-system
```

---

## Step 5 — Run automated install

On the Pi, as root:

```bash
cd ~/deployment/raspberry-pi   # or path to this folder
sudo bash install.sh ~/V2      # or path to V2 source
```

`install.sh` will:

- Install `apache2`, `mariadb-server`, PHP 8.2 + extensions (`pdo_mysql`, `gd`, `mbstring`, …)
- Enable Apache `mod_rewrite`
- Copy `V2/` to `/var/www/cafe-audit/`
- Install the virtual host from `apache/cafe-audit.conf`
- Create writable `storage/uploads/`
- Create MariaDB database user (schema import is next step)
- Apply low-memory MariaDB settings for 1 GB RAM

---

## Step 6 — Database setup

Secure MariaDB if you have not already:

```bash
sudo mysql_secure_installation
```

Import schema, seed, and demo users:

```bash
sudo bash setup-db.sh
```

Enter the MariaDB root password when prompted.

This runs:

1. `database/schema.sql`
2. `database/seed.sql`
3. `php database/install.php` (BCrypt users, 8 demo tables, sample shift)

---

## Step 7 — Configure APP_URL

Edit `/etc/cafe-audit/env` (created from `env.example`):

```bash
sudo nano /etc/cafe-audit/env
```

Set:

```text
APP_URL=http://192.168.1.50
```

Or `http://cafe-audit.local` if you use local DNS/hosts.

Re-run the Apache env injection or add manually to `/etc/apache2/sites-available/cafe-audit.conf` inside the `<VirtualHost>` block:

```apache
SetEnv APP_URL http://192.168.1.50
```

Reload Apache:

```bash
sudo systemctl reload apache2
```

**Important:** QR codes embed `APP_URL`. Regenerate or reprint table QRs after changing the URL.

---

## Step 8 — Apache virtual host (reference)

`apache/cafe-audit.conf` points DocumentRoot to `/var/www/cafe-audit/public`:

```apache
DocumentRoot /var/www/cafe-audit/public
<Directory /var/www/cafe-audit/public>
    AllowOverride All
    Require all granted
</Directory>
```

`public/.htaccess` routes requests through `index.php` (front controller).

Verify:

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/login
# Expect 200
```

---

## Step 9 — Firewall (optional)

For a closed cafe LAN, UFW is optional:

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw enable
```

Do **not** expose port 80 to the public internet without HTTPS and hardening.

---

## Step 10 — Auto-start on boot

`install.sh` enables `apache2` and `mariadb`:

```bash
sudo systemctl enable apache2 mariadb
```

After power loss, the Pi boots and services start automatically. Verify:

```bash
sudo systemctl status apache2 mariadb
```

---

## Demo flow for teachers (15-minute LAN demo)

1. **Pi on cafe Wi‑Fi** — Apache and MariaDB running; `APP_URL` matches Pi IP.
2. **Projector laptop** — browser on `http://PI_IP/login`; login as **manager** / `admin123` (Dagim Dereje).
3. **Show dashboard** — low stock, open shift, recent sales.
4. **Tables** — open table T01, show QR code on screen or printed card.
5. **Phone on same Wi‑Fi** — scan QR → customer menu → add items → submit order.
6. **Kitchen login** (`kitchen1`) — order appears; mark **preparing** → **served**.
7. **Waiter** (`waiter1`) — tablet view, request bill.
8. **Customer** — itemized receipt (VAT, service charge); upload Telebirr screenshot.
9. **Cashier** (`cashier1`) — verify payment, mark order **paid** → inventory deducts via recipes.
10. **Auditor** (`auditor`) — reconciliation; enter physical counts; show variance flags above 10%.
11. **Reports** — export CSV or print PDF.

No cloud, no Docker — “this is how a small cafe could run it.”

---

## Demo logins

Password for all: `admin123`

| Username | Role | Demo name |
|----------|------|-----------|
| manager | Manager | Dagim Dereje |
| auditor | Auditor | Hana Wabe |
| waiter1 | Waiter | Biruk G/Tinsae |
| kitchen1 | Kitchen | Sara Bekele |
| cashier1 | Cashier | Kebede Alemu |
| admin | Admin | System Admin |

---

## Troubleshooting

### 403 Forbidden

- DocumentRoot must be `.../public`, not the project root.
- Permissions: `sudo chown -R www-data:www-data /var/www/cafe-audit`
- `AllowOverride All` and `Require all granted` in the vhost.

### Blank page or 500

```bash
sudo tail -f /var/log/apache2/cafe-audit-error.log
```

Common fixes: install `php8.2-gd`, enable `mod_rewrite`, fix `storage/` permissions.

### Database connection failed

- Check MariaDB: `sudo systemctl status mariadb`
- Credentials in `config/database.php` or env vars `V2_DB_*`
- User exists: `sudo mysql -e "SHOW GRANTS FOR 'restaurant_user'@'localhost';"`

### mysqli / PDO errors

Ensure extensions are installed:

```bash
php -m | grep -E 'pdo_mysql|gd|mbstring'
```

### QR codes show wrong host

`APP_URL` must match how phones reach the server. Fix env, reload Apache, reprint QRs from **Tables** page.

### Low memory / slow performance (1 GB RAM)

1. **Enable swap** (1 GB file):

   ```bash
   sudo dphys-swapfile swapoff
   sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
   sudo dphys-swapfile setup && sudo dphys-swapfile swapon
   ```

2. **MariaDB** — `install.sh` writes `innodb_buffer_pool_size = 64M` in `99-cafe-audit.cnf`.

3. **Close desktop** — use Raspberry Pi OS Lite for headless server.

4. **Limit concurrent users** — fine for thesis demo (5–10 devices), not hundreds.

### Customer phone cannot reach Pi

- Phone must be on the **same subnet** as the Pi (same Wi‑Fi, not guest isolation).
- Some university Wi‑Fi blocks device-to-device traffic — use a mobile hotspot or your own router for demo.

---

## Performance tips for Pi 3 B+ (1 GB)

| Setting | Recommendation |
|---------|----------------|
| OS | 64-bit Bookworm Lite |
| Swap | 1 GB via `dphys-swapfile` |
| MariaDB `innodb_buffer_pool_size` | 64M (set by install.sh) |
| Apache | Default worker settings; avoid heavy concurrent PDF generation |
| SD card | Class 10 / A1 or USB SSD boot for reliability |

---

## Updating the app

```bash
sudo bash install.sh /path/to/new/V2
sudo systemctl reload apache2
```

Database migrations: apply any new `database/patch_*.sql` files manually, then test.

---

## Files in this folder

| File | Purpose |
|------|---------|
| `install.sh` | Main installer (packages, Apache, app copy) |
| `setup-db.sh` | Schema, seed, `install.php` |
| `apache/cafe-audit.conf` | Virtual host template |
| `env.example` | `APP_URL` and DB vars for `/etc/cafe-audit/env` |
| `README.md` | This guide |

Unity University — Cafe Audit System
