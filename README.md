# ⚡ VAREX CI/CD HUB

A secure, password-protected, self-deploying continuous integration & continuous deployment (CI/CD) web platform with a bold **Neobrutalist interface**. Built specifically for developers, devops engineers, and teams running Linux VPS instances (Hostinger, AWS, DigitalOcean, Hetzner, etc.) or local servers who want complete control over multi-container Docker Compose stacks, automated deployments, and system resources without complex, bloatware enterprise agents.

---

## 🌟 Key Features

### 1. 🐳 Multi-Container Live Logs (Docker Compose Stacks)
- **Separate Terminals Per Service:** When running multi-container stacks (e.g. Frontend, Backend API, Database, Worker, Cache), Varex streams each container's live logs in its own dedicated terminal side-by-side or in tabbed views.
- **Continuous Circular Buffering:** Streams `docker logs -f` without blocking server memory via an in-memory 1,500-line circular ring buffer per service.
- **Auto-Idle Watchdog:** Automatically monitors active WebSocket viewers; if zero users are watching a terminal for over 5 minutes, Varex terminates the background child process to preserve server CPU and RAM.
- **Rich Terminal Capabilities:** Full ANSI 256-color rendering, live search/filtering, auto-scroll toggle, 1-click clipboard copy, and `.log` file download.

### 2. 🎮 Container Quick Actions & Remote Command Exec
- **Lifecycle Controls:** Trigger `Restart`, `Stop`, or `Start` on any Docker container directly from its terminal header with live execution feedback.
- **Interactive Command Exec:** Run one-off commands (e.g. `npx prisma migrate deploy`, `python manage.py check`, `npm test`, or `ls -la`) either inside the running container (`docker exec -i`) or directly in the project host working directory.
- **Instant Output Viewer:** Displays execution exit codes, stdout, and stderr with clear Neobrutalist badges.

### 3. 🪝 GitHub Webhook Auto-Deploy (HMAC SHA-256)
- **Zero-Latency Push Deployment:** Pushing commits to your GitHub repository automatically triggers an automated pipeline build on your server.
- **Cryptographic Security:** Verifies incoming webhook payloads using GitHub's HMAC SHA-256 signature algorithm (`X-Hub-Signature-256`) against your project's unique secret token.
- **Branch Filtering:** Automatically filters push events (e.g. only triggers on `main` or `production`), safely ignoring development branches.
- **Delivery Audit Log:** View recent webhook deliveries directly in the project settings, including commit hashes, messages, sender usernames, and timestamps.

### 4. ⏰ Scheduled Deployments (Built-in Cron Engine)
- **Automated Recurring Runs:** Schedule automated deployments on custom timetables (e.g. nightly builds, periodic cache refreshes, database seed syncs).
- **Flexible Syntax:** Supports standard 5-part cron expressions (`minute hour day month weekday`) and popular aliases (`@daily`, `@weekly`, `@hourly`, `0 */12 * * *`).
- **Precision Daemon:** Built-in scheduler daemon checks active schedules every 30 seconds with zero external dependencies or cron packages.

### 5. ↺ One-Click Rollback
- **Instant Recovery:** If a faulty commit or breaking change causes production errors, rollback to any previously verified successful deployment run with 1 click from the Deployment History table.
- **Safe Re-Deployment:** Re-runs the exact proven steps from that deployment run and records an immutable audit record with `trigger_type: ROLLBACK` and `rollback_from_id`.

### 6. 📊 VPS & Docker Resource Monitor
- **Real-Time System Metrics:** Top navigation bar widget displaying live RAM usage percentage, Free Disk space in GB (computed natively via `fs.statfsSync`), CPU cores & load averages, and uptime.
- **1-Click Docker Prune:** Quick-action modal to run `docker system prune -f`, reclaiming gigabytes of disk space consumed by dangling images, stopped containers, and build cache with output feedback.

### 7. 🛠️ Dual-Mode Pipeline Step Builder
- **Multiline Shell Script Mode:** Write shell scripts directly as freeform multiline scripts:
  ```bash
  git pull origin main
  npm install
  npm run build
  docker compose up -d --build
  ```
- **Step-by-Step Command Mode:** Visual step builder with draggable order, step enable/disable toggles, "continue on error" options, and 1-click DevOps command snippets (Git, NPM, Docker, PM2).
- **Smooth Mode Switching:** Effortlessly switch between script and steps modes with bidirectional parsing.

### 8. 🛡️ Strict Authentication & Role-Based Approval Workflow
- **Zero Public Endpoints:** Every route, static asset, and WebSocket connection is protected behind secure JWT authentication.
- **Approval Queue:** New registrations enter a `PENDING_APPROVAL` queue and cannot log in until approved by a Main Administrator.
- **Hierarchical Roles:** Main Administrators have complete administrative privileges (approving users, managing server settings); Sub Administrators can trigger deployments and view live logs.

### 9. 📜 Immutable Audit Trail
- **Dual Logging:** Writes human-readable audit lines to physical log files (`data/logs/audit.log`) for SSH tailing (`tail -f audit.log`) and structured JSON to SQLite.
- **Complete Traceability:** Tracks logins, failed access attempts, approvals, project creation, step edits, deployment triggers, rollbacks, and container actions with user identities and IP addresses.

### 10. 🚀 Self-Deploying Capability
- Add Varex itself as a project in the dashboard to update and rebuild the platform with zero downtime!

---

## 🏗️ Technology Architecture

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS with Neobrutalist design foundations (`#FAF7EE` warm background, `#FACC15` cyber yellow accents, thick 2px solid black borders, and hard drop-shadows).
- **Backend:** Node.js 22+, Express 4, Native `node:sqlite` (zero native C++ build tools required; automatic WAL mode for high concurrency), and `ws` (WebSockets).
- **Production Process:** PM2 in `fork` mode (Port `3040`).
- **Reverse Proxy:** Nginx with Let's Encrypt SSL / Certbot.

---

## 📖 Production VPS Deployment Runbook (Zero Data Loss)

Follow this verified guide to deploy or update Varex on an Ubuntu VPS (e.g. Hostinger, AWS, DigitalOcean) without losing existing databases, users, or configuration.

### 1. Prerequisites
- Ubuntu 22.04 or 24.04 LTS
- Node.js 22+ (`node -v`)
- PM2 (`npm install -g pm2`)
- Nginx & Certbot

```bash
# If Node.js is below v22, install Node.js 22 LTS:
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

### 2. Updating an Existing Deployment (Zero Data Loss)

Your SQLite database (`data/varex.db`) and `.env` file contain your live users, projects, and pipeline history. **Never delete the `data/` folder.**

```bash
# 1. Navigate to the project directory
cd /var/www/varex

# 2. Pull the latest updates from main
git pull origin main

# 3. Install dependencies across root, server, and client
npm run install:all

# 4. Build both frontend and backend
npm run build

# 5. Ensure folder ownership belongs to your deploy user (e.g. Admin)
sudo chown -R Admin:Admin /var/www/varex

# 6. Restart PM2 with updated environment variables
pm2 restart varex-cicd --update-env
pm2 save
```

---

### 3. Fresh Installation on a New VPS

```bash
# 1. Clone the repository
sudo git clone https://github.com/your-username/varex.git /var/www/varex
sudo chown -R $USER:$USER /var/www/varex
cd /var/www/varex

# 2. Install dependencies & build
npm run install:all
npm run build

# 3. Configure environment variables
cp server/.env.example .env
nano .env
```

Set your production `.env` values:
```env
PORT=3040
NODE_ENV=production
JWT_SECRET=generate-a-strong-32-char-secret-string-here
DATA_DIR=/var/www/varex/data
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123!
```

```bash
# 4. Start with PM2 in fork mode
PORT=3040 pm2 start server/dist/index.js --name varex-cicd
pm2 save
pm2 startup
```

---

### 4. Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/varex`:

```nginx
server {
    server_name cicd.yourdomain.com;

    # Client body limit for file uploads / builds
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3040;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering for live streaming logs
        proxy_buffering off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable site and test Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/varex /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### 5. Hostinger Firewall & Let's Encrypt SSL

1. In the Hostinger VPS panel under **Security $\to$ Firewall**, ensure rules allow:
   - Port `80` (HTTP) &rarr; `Accept`
   - Port `443` (HTTPS) &rarr; `Accept`
   - Port `22` (SSH) &rarr; `Accept`
2. Obtain SSL certificate with Certbot:
   ```bash
   sudo certbot --nginx -d cicd.yourdomain.com
   ```

---

## 🪝 Configuring GitHub Webhooks

1. Open your project in the Varex dashboard &rarr; click **Project Settings** &rarr; switch to the **Webhooks & Cron** tab.
2. Toggle **GitHub Webhook Auto-Deploy** to `Active`.
3. Copy the **Payload URL** (`https://cicd.yourdomain.com/api/webhooks/github/<project-slug>`).
4. Click **Generate Secret** and copy the secret key.
5. In your GitHub repository:
   - Go to **Settings** &rarr; **Webhooks** &rarr; **Add webhook**.
   - **Payload URL:** Paste the URL copied from Varex.
   - **Content type:** Select `application/json`.
   - **Secret:** Paste the secret key.
   - **Which events would you like to trigger this webhook?:** Select **Just the push event**.
   - Click **Add webhook**.
6. Every `git push` to your target branch will now automatically trigger a build in Varex!

---

## ⏰ Configuring Scheduled Deployments (Cron)

In **Project Settings** &rarr; **Webhooks & Cron**:
1. Toggle **Scheduled Deployments (Cron)** to `Active`.
2. Enter a standard 5-part cron expression or click one of the quick presets:
   - `@daily` — Runs midnight every day (`0 0 * * *`)
   - `@weekly` — Runs midnight every Sunday (`0 0 * * 0`)
   - `@hourly` — Runs at the start of every hour (`0 * * * *`)
   - `0 */12 * * *` — Runs every 12 hours
3. Click **Save Changes**. The Varex internal cron daemon checks every 30 seconds and triggers pipeline runs with badge `⏰ Cron`.

---

## ↺ Rolling Back Deployments

1. Open your project and click the **Deployment History** tab.
2. Every previous run displays its status (`SUCCESS`, `FAILED`, `RUNNING`) and trigger source (`🪝 Webhook`, `↺ Rollback`, `⏰ Cron`, or `👤 Manual`).
3. On any successful deployment run, click the yellow **Rollback** button.
4. Confirm the prompt; Varex will immediately re-run the proven steps from that deployment run and open the live terminal.

---

## 📁 Repository Structure

```text
varex/
├── client/                      # React 19 + TypeScript + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── api/                 # Typed API client, WebSockets, Interfaces
│   │   ├── components/          # Neobrutalist UI Components
│   │   │   ├── LiveServicesLogViewer.tsx  # Multi-Container Terminals & Container Actions
│   │   │   ├── SystemResourceWidget.tsx    # Live RAM %, Disk Free GB, Docker Prune
│   │   │   ├── ProjectModal.tsx            # Settings, Webhooks & Cron configuration
│   │   │   ├── CreateProjectModal.tsx      # Dual-mode script/steps project creation
│   │   │   ├── TerminalViewer.tsx          # Real-time ANSI log terminal
│   │   │   ├── Navbar.tsx                  # Header with system widget & navigation
│   │   │   └── ...
│   │   └── pages/               # LoginPage, RegisterPage
│   └── package.json
├── server/                      # Node.js + Express backend (built-in node:sqlite)
│   ├── src/
│   │   ├── db/                  # SQLite schema, WAL mode, migrations, admin seeding
│   │   ├── routes/              # Webhook, System, Deploy, Project, Auth, User, Audit
│   │   ├── services/            # ScheduleService, RunnerService, ServiceLogService, etc.
│   │   ├── websocket.ts         # Multi-channel WebSocket broker
│   │   └── index.ts             # Express HTTP & WS server entrypoint
│   └── package.json
├── data/                        # Persistent storage (Never delete in production!)
│   ├── logs/
│   │   └── audit.log            # Physical append-only audit log
│   └── varex.db                 # High-performance SQLite database
├── pm2.config.cjs               # PM2 configuration in fork mode
├── nginx.conf.example           # Ready-to-use Nginx reverse proxy configuration
├── package.json                 # Unified build & lifecycle scripts
└── README.md                    # Comprehensive documentation
```

---

## 🔒 Security Best Practices

1. **Change Default Credentials:** Change the initial Main Admin password immediately upon first login.
2. **Always Use HTTPS:** Run behind Nginx with Let's Encrypt SSL to encrypt tokens, passwords, and terminal streams.
3. **Use HMAC Webhook Secrets:** Always generate and configure secrets for GitHub webhooks to prevent spoofed triggers.
4. **Environment Variables:** Keep sensitive API keys in the **Environment Variables** tab of your project rather than hardcoding them into pipeline scripts.

---

## 📄 License
MIT License. Built for internal engineering teams and developers who value speed, simplicity, and full operational control.
