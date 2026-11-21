import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';

export function requireMainAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'MAIN_ADMIN') {
    res.status(403).json({ error: 'Access denied. Main Administrator privileges required.' });
    return;
  }
  next();
}
