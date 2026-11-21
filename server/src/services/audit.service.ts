import fs from 'fs';
import { AUDIT_LOG_FILE, LOGS_DIR } from '../config.js';
import { db } from '../db/index.js';

export interface AuditEntry {
  userId?: number | null;
  username: string;
  userRole: string;
  ipAddress: string;
  action: string;
  target?: string;
  details?: string;
}

export class AuditService {
  private static fileStream: fs.WriteStream | null = null;

  private static getStream(): fs.WriteStream {
    if (!this.fileStream) {
      if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
      }
      this.fileStream = fs.createWriteStream(AUDIT_LOG_FILE, { flags: 'a' });
    }
    return this.fileStream;
  }

  /**
   * Log an audit action to BOTH the physical audit.log file and the SQLite database.
   */
  public static log(entry: AuditEntry): void {
    const timestamp = new Date().toISOString();
    const userId = entry.userId ?? null;
    const target = entry.target || '';
    const details = entry.details || '';

    // 1. Write to SQLite audit_logs table
    try {
      db.prepare(`
        INSERT INTO audit_logs (timestamp, user_id, username, user_role, ip_address, action, target, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        timestamp,
        userId,
        entry.username,
        entry.userRole,
        entry.ipAddress,
        entry.action,
        target,
        details
      );
    } catch (err: any) {
      console.error('[AUDIT DB ERROR]', err.message);
    }

    // 2. Append formatted line to audit.log file
    try {
      const line = `[${timestamp}] [IP: ${entry.ipAddress}] [USER: ${entry.username} (${entry.userRole})] ACTION: ${entry.action} | TARGET: ${target || 'N/A'} | DETAILS: ${details || 'None'}\n`;
      this.getStream().write(line);
    } catch (err: any) {
      console.error('[AUDIT FILE ERROR]', err.message);
    }
  }

  public static getLogs(options: {
    limit?: number;
    offset?: number;
    username?: string;
    action?: string;
  } = {}) {
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (options.username) {
      query += ' AND username LIKE ?';
      params.push(`%${options.username}%`);
    }

    if (options.action) {
      query += ' AND action LIKE ?';
      params.push(`%${options.action}%`);
    }

    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params);
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number };

    return {
      total: totalCount.count,
      limit,
      offset,
      logs: rows
    };
  }

  public static getRawLogFilePath(): string {
    return AUDIT_LOG_FILE;
  }
}
