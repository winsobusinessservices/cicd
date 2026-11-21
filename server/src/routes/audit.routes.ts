import { Router, Response } from 'express';
import fs from 'fs';
import { AuditService } from '../services/audit.service.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const auditRouter = Router();

auditRouter.use(requireAuth);

// 1. Get paginated and filtered audit logs
auditRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const username = req.query.username as string | undefined;
  const action = req.query.action as string | undefined;

  const result = AuditService.getLogs({
    limit,
    offset,
    username,
    action,
  });

  res.json(result);
});

// 2. Download the physical raw audit.log file
auditRouter.get('/download', (req: AuthenticatedRequest, res: Response): void => {
  const filePath = AuditService.getRawLogFilePath();

  if (!fs.existsSync(filePath)) {
    res.status(404).send('No audit log file exists yet.');
    return;
  }

  res.download(filePath, 'varex-audit.log');
});
