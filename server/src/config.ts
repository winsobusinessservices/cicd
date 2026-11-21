import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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
export const JWT_SECRET_FILE = path.join(DATA_DIR, '.jwt_secret');

export const PORT = parseInt(process.env.PORT || '3000', 10);

function getOrGenerateJwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '') {
    return process.env.JWT_SECRET;
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(JWT_SECRET_FILE)) {
    try {
      const savedSecret = fs.readFileSync(JWT_SECRET_FILE, 'utf-8').trim();
      if (savedSecret.length >= 32) {
        return savedSecret;
      }
    } catch {
      // ignore
    }
  }
  const generatedSecret = crypto.randomBytes(64).toString('hex');
  try {
    fs.writeFileSync(JWT_SECRET_FILE, generatedSecret, { encoding: 'utf-8' });
  } catch (err: any) {
    console.warn('Could not persist .jwt_secret file:', err.message);
  }
  return generatedSecret;
}

export const JWT_SECRET = getOrGenerateJwtSecret();
export const JWT_EXPIRES_IN = '7d';

export const INITIAL_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const INITIAL_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@varex.local';
export const INITIAL_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
