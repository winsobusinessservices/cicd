import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { spawnSync } from 'child_process';
import { JWT_SECRET, JWT_EXPIRES_IN, SERVER_SUDO_PASSWORD } from '../config.js';
import { db } from '../db/index.js';

export interface UserRow {
  id: number;
  username: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'MAIN_ADMIN' | 'SUB_ADMIN';
  is_approved: number;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface UserSummary {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'MAIN_ADMIN' | 'SUB_ADMIN';
  isApproved: boolean;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

export function toUserSummary(row: UserRow): UserSummary {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    role: row.role,
    isApproved: row.is_approved === 1,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
  };
}

export class AuthService {
  public static generateToken(user: UserSummary): string {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  public static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }

  public static hashPassword(password: string): string {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }

  public static comparePassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }

  public static findByUsernameOrEmail(identifier: string): UserRow | undefined {
    return db.prepare(`
      SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
    `).get(identifier, identifier) as unknown as UserRow | undefined;
  }

  public static findById(id: number): UserRow | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as UserRow | undefined;
  }

  /**
   * Verify elevated sudo authorization before allowing changes to sensitive environment variables/secrets.
   * Checks against:
   * 1. Server-level SERVER_SUDO_PASSWORD environment variable if configured.
   * 2. Host Linux OS sudo verification (via sudo -k -S true) if deployed on Linux.
   * 3. Fallback to authenticated Main Admin's master account password.
   */
  public static verifySudoElevation(password: string, userId: number): boolean {
    if (!password || typeof password !== 'string') return false;

    // 1. Explicit server sudo password in environment
    if (SERVER_SUDO_PASSWORD && SERVER_SUDO_PASSWORD.trim() !== '') {
      if (password === SERVER_SUDO_PASSWORD) {
        return true;
      }
    }

    // 2. Linux OS sudo verification if running on Linux
    if (process.platform === 'linux') {
      try {
        const check = spawnSync('sudo', ['-k', '-S', 'true'], {
          input: password + '\n',
          encoding: 'utf-8',
          timeout: 4000,
        });
        if (check.status === 0) {
          return true;
        }
      } catch {
        // Fallback to application admin credentials
      }
    }

    // 3. Fallback: Authenticated Main Admin account password
    const user = this.findById(userId);
    if (user && user.role === 'MAIN_ADMIN') {
      return this.comparePassword(password, user.password_hash);
    }

    return false;
  }
}
