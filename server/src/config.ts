import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, '../../');
export const DATA_DIR = process.env.DATA_DIR || path.join(ROOT_DIR, 'data');
export const LOGS_DIR = path.join(DATA_DIR, 'logs');
export const DB_PATH = path.join(DATA_DIR, 'varex.db');
export const AUDIT_LOG_FILE = path.join(LOGS_DIR, 'audit.log');

export const PORT = parseInt(process.env.PORT || '3000', 10);
export const JWT_SECRET = process.env.JWT_SECRET || 'varex-super-secret-jwt-key-2026-production-ready';
export const JWT_EXPIRES_IN = '7d';

export const INITIAL_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const INITIAL_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@varex.local';
export const INITIAL_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
