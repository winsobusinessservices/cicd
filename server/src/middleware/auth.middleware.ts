import { Request, Response, NextFunction } from 'express';
import { AuthService, UserSummary, toUserSummary, UserRow } from '../services/auth.service.js';
import { db } from '../db/index.js';

export interface AuthenticatedRequest extends Request {
  user?: UserSummary;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const payload = AuthService.verifyToken(token);
  if (!payload || !payload.id) {
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    return;
  }

  // Verify user still exists in database and remains approved
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id) as UserRow | undefined;
  if (!user) {
    res.status(401).json({ error: 'User account not found.' });
    return;
  }

  if (user.is_approved !== 1) {
    res.status(403).json({ error: 'Your account is pending Main Admin approval.' });
    return;
  }

  req.user = toUserSummary(user);
  next();
}
