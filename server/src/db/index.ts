import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import {
  DB_PATH,
  DATA_DIR,
  LOGS_DIR,
  INITIAL_ADMIN_USERNAME,
  INITIAL_ADMIN_EMAIL,
  INITIAL_ADMIN_PASSWORD
} from '../config.js';

// Ensure data and log directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys for high performance and durability
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase(): void {
  // 1. Users table (Supports Main Admin and Sub Admin with approval workflow)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('MAIN_ADMIN', 'SUB_ADMIN')),
      is_approved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      approved_at TEXT,
      approved_by TEXT
    );
  `);

  // 2. Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      project_path TEXT NOT NULL,
      env_vars TEXT DEFAULT '{}',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 3. Pipeline Steps table (sequential commands per project)
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL,
      name TEXT NOT NULL,
      command TEXT NOT NULL,
      working_dir TEXT DEFAULT '',
      is_enabled INTEGER NOT NULL DEFAULT 1,
      continue_on_error INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 4. Deployments history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS deployments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      project_name TEXT NOT NULL,
      triggered_by_user_id INTEGER NOT NULL,
      triggered_by_username TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'ABORTED')),
      started_at TEXT NOT NULL,
      finished_at TEXT,
      duration_ms INTEGER DEFAULT 0,
      exit_code INTEGER,
      logs TEXT DEFAULT '',
      error_message TEXT
    );
  `);

  // 5. Audit Logs table (persistent database audit trail)
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      user_id INTEGER,
      username TEXT NOT NULL,
      user_role TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT DEFAULT '',
      details TEXT DEFAULT ''
    );
  `);

  // 6. Project Services table (Multi-container / Docker Compose Live Logs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      log_command TEXT NOT NULL,
      working_dir TEXT DEFAULT '',
      color TEXT DEFAULT 'blue',
      display_order INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Index creation for fast queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pipeline_project_order ON pipeline_steps(project_id, step_order);
    CREATE INDEX IF NOT EXISTS idx_deployments_project ON deployments(project_id, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_services_project ON project_services(project_id, display_order);
  `);

  // Seed default Main Admin if table is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(INITIAL_ADMIN_PASSWORD, salt);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (username, name, email, password_hash, role, is_approved, created_at, approved_at, approved_by)
      VALUES (?, ?, ?, ?, 'MAIN_ADMIN', 1, ?, ?, 'SYSTEM_INIT')
    `).run(INITIAL_ADMIN_USERNAME, 'Main Administrator', INITIAL_ADMIN_EMAIL, hash, now, now);

    console.log(`[INIT] Seeded Initial Main Admin: "${INITIAL_ADMIN_USERNAME}" (Password: "${INITIAL_ADMIN_PASSWORD}")`);
  }
}
