# Varex CI/CD Hub

A secure, password-protected, self-deploying continuous deployment web platform designed for internal organizational operations. Run it on your production Linux VPS or local server to orchestrate zero-hassle deployments for all your websites and services with live terminal output, custom step pipelines, and immutable audit logs.

---

## 🌟 Key Features

1. **Strict Password-Protected Access (Zero Public Endpoints)**
   - All dashboard views and APIs are protected behind JWT authentication and role-based permissions.
   - Any unauthenticated request is redirected to `/login`.

2. **Main Admin & Sub Admin Hierarchical Approval Workflow**
   - **User Registration:** Anyone can register with Name, Username, Email, and Password.
   - **Approval Queue:** Newly registered users are placed into `PENDING_APPROVAL` status and cannot access or log into the platform until approved.
   - **Main Admin Dashboard:** Main Administrators can inspect pending registration requests, approve them as **Sub Admins** or promote to **Main Admin**, or reject/delete them.
   - **Direct User Creation:** Main Admins can create and immediately approve team members directly from the UI.

3. **Custom Pipeline Step Builder**
   - Configure project working directory on the host server (e.g. `/var/www/my-site` or `D:\projects\my-app`).
   - Define custom sequential shell commands:
     - Step 1: `git pull origin main`
     - Step 2: `npm install && npm run build`
     - Step 3: `docker compose up -d --build`
   - Reorder steps, enable/disable individual steps, or set "continue on error".
   - Preset templates for one-click insertion of common DevOps tasks (Git, Docker, NPM, PM2).
   - Configurations are auto-persisted in SQLite.

4. **One-Click Deploy & Live Terminal Log Streaming**
   - Click **Deploy** to execute the pipeline steps in sequence on the host server.
   - If any step fails (non-zero exit code), the runner immediately halts execution to protect your live service.
   - Terminal logs stream in real-time over WebSockets with full ANSI color decoding (Docker, Git, and NPM colors rendered cleanly).
   - Interactive terminal viewer with auto-scroll, copy logs, download log file, and abort controls.

5. **Immutable Audit Trail (File + Web UI)**
   - **Physical File:** Appends formatted lines to `data/logs/audit.log` for direct SSH inspection (`tail -f audit.log`).
   - **Database & Web UI:** Stores structured audit records in the SQLite `audit_logs` table.
   - Tracks:
     - User logins and logout events (including failed login attempts and unapproved access blocks).
     - User registrations, approvals, rejections, and role changes.
     - Project registrations, updates, and deletions.
     - Pipeline step modifications.
     - Deployment triggers, completions, and cancellations with duration and exit codes.
     - Client IP address and timestamps.

6. **Self-Deploying Capability**
   - Add Varex itself as a project in the UI.
   - Configure its steps:
     ```bash
     git pull origin main
     npm run build:client
     npm run build:server
     pm2 reload varex || systemctl restart varex
     ```
   - Click **Deploy** to update the CI/CD platform itself!

---

## 🚀 Quickstart

### 1. Requirements
- Node.js 20+ or 22+ (Includes built-in `node:sqlite` — no compiler tools or python needed)
- Git & Docker (installed on host)

### 2. Installation & Build
```bash
# In repository root:
npm run install:all
npm run build
```

### 3. Start the Server
```bash
npm start
```
By default, the server runs on `http://0.0.0.0:3000`.

---

## 🔑 Initial Credentials

On the first startup, the database automatically seeds the initial **Main Administrator**:
- **Username:** `admin`
- **Email:** `admin@varex.local`
- **Password:** `AdminPassword123!`

*(You can customize these via environment variables `ADMIN_USERNAME` and `ADMIN_PASSWORD` before first boot, or change them from the dashboard).*

---

## ⚙️ Environment Variables

Create a `.env` file in `server/` or pass them directly:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the HTTP and WebSocket server |
| `JWT_SECRET` | `varex-super-secret-jwt-key...` | Cryptographic secret for signing session tokens |
| `DATA_DIR` | `./data` | Directory for SQLite database (`varex.db`) and logs |
| `ADMIN_USERNAME`| `admin` | Initial seeded Main Admin username |
| `ADMIN_PASSWORD`| `AdminPassword123!` | Initial seeded Main Admin password |

---

## 🌐 Production VPS Deployment (Behind Caddy or Nginx)

Run the service with **PM2** so it stays running across reboots:

```bash
npm install -g pm2
pm2 start server/dist/index.js --name "varex-hub"
pm2 save
pm2 startup
```

### Caddyfile (Automatic HTTPS / SSL)
```caddy
hub.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Caddy automatically provisions SSL certificates and handles WebSocket upgrade headers for live log streaming without additional configuration.

---

## 📁 Repository Structure

```text
d:\varex/
├── client/              # React 19 + TypeScript + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── api/         # Strongly typed API & WebSocket client
│   │   ├── components/  # Navbar, TerminalViewer, StepEditor, ProjectModal, AuditLogView, UserManagementView
│   │   └── pages/       # LoginPage, RegisterPage
│   └── package.json
├── server/              # Node.js + Express + WebSocket backend (with built-in node:sqlite)
│   ├── src/
│   │   ├── db/          # SQLite schema, WAL mode, migrations, initial admin seed
│   │   ├── services/    # AuditService, AuthService, ProjectService, RunnerService, UserService
│   │   ├── routes/      # Auth, Users/Approvals, Projects, Deployments, Audit
│   │   ├── middleware/  # Auth guard, Main Admin role guard
│   │   ├── websocket.ts # WebSocket connection & log broadcasting manager
│   │   └── index.ts     # Main server entrypoint (serves static UI & API on port 3000)
│   └── package.json
├── data/                # Auto-created persistent storage
│   ├── logs/
│   │   └── audit.log    # Immutable physical audit log file
│   └── varex.db         # High-performance SQLite database
├── package.json         # Unified scripts for build and execution
└── README.md
```
