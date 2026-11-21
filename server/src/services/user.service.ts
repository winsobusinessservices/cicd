import { db } from '../db/index.js';
import { AuthService, UserRow, UserSummary, toUserSummary } from './auth.service.js';

export class UserService {
  public static getAllUsers(): UserSummary[] {
    const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as unknown as UserRow[];
    return rows.map(toUserSummary);
  }

  public static getPendingUsers(): UserSummary[] {
    const rows = db.prepare('SELECT * FROM users WHERE is_approved = 0 ORDER BY created_at DESC').all() as unknown as UserRow[];
    return rows.map(toUserSummary);
  }

  public static approveUser(userId: number, approvedBy: string, role: 'SUB_ADMIN' | 'MAIN_ADMIN' = 'SUB_ADMIN'): UserSummary | null {
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE users
      SET is_approved = 1, approved_at = ?, approved_by = ?, role = ?
      WHERE id = ?
    `).run(now, approvedBy, role, userId);

    if (result.changes === 0) return null;
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as UserRow;
    return toUserSummary(updated);
  }

  public static rejectUser(userId: number): boolean {
    const result = db.prepare('DELETE FROM users WHERE id = ? AND is_approved = 0').run(userId);
    return result.changes > 0;
  }

  public static updateUserRole(userId: number, role: 'SUB_ADMIN' | 'MAIN_ADMIN'): UserSummary | null {
    const result = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
    if (result.changes === 0) return null;
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as UserRow;
    return toUserSummary(updated);
  }

  public static deleteUser(userId: number): boolean {
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    return result.changes > 0;
  }

  public static registerUser(data: {
    username: string;
    name: string;
    email: string;
    password: string;
  }): UserSummary {
    const now = new Date().toISOString();
    const hash = AuthService.hashPassword(data.password);

    const result = db.prepare(`
      INSERT INTO users (username, name, email, password_hash, role, is_approved, created_at)
      VALUES (?, ?, ?, ?, 'SUB_ADMIN', 0, ?)
    `).run(data.username, data.name, data.email, hash, now);

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(result.lastInsertRowid)) as unknown as UserRow;
    return toUserSummary(newUser);
  }

  public static createApprovedUser(data: {
    username: string;
    name: string;
    email: string;
    password: string;
    role: 'SUB_ADMIN' | 'MAIN_ADMIN';
    createdBy: string;
  }): UserSummary {
    const now = new Date().toISOString();
    const hash = AuthService.hashPassword(data.password);

    const result = db.prepare(`
      INSERT INTO users (username, name, email, password_hash, role, is_approved, created_at, approved_at, approved_by)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(data.username, data.name, data.email, hash, data.role, now, now, data.createdBy);

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(result.lastInsertRowid)) as unknown as UserRow;
    return toUserSummary(newUser);
  }
}
