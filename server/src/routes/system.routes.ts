import { Router, Response } from 'express';
import os from 'os';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { requireMainAdmin } from '../middleware/role.middleware.js';
import { AuditService } from '../services/audit.service.js';

const execAsync = promisify(exec);
export const systemRouter = Router();

function getClientIp(req: any): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
}

systemRouter.use(requireAuth);

// 1. Get VPS, Memory, Disk and Docker resource usage
systemRouter.get('/stats', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = Math.round((usedMem / totalMem) * 100);

  // Disk metrics via native statfs
  let totalDisk = 0;
  let freeDisk = 0;
  let usedDisk = 0;
  let diskPercent = 0;

  try {
    const stat = fs.statfsSync(process.cwd());
    totalDisk = Number(stat.blocks) * Number(stat.bsize);
    freeDisk = Number(stat.bavail) * Number(stat.bsize);
    usedDisk = totalDisk - freeDisk;
    diskPercent = totalDisk > 0 ? Math.round((usedDisk / totalDisk) * 100) : 0;
  } catch {
    // fallback if statfs not available
  }

  // Check Docker CLI availability
  let dockerAvailable = false;
  let dockerSummary = '';
  try {
    const { stdout } = await execAsync('docker system df', { timeout: 3000 });
    dockerAvailable = true;
    dockerSummary = stdout.trim();
  } catch {
    dockerAvailable = false;
  }

  res.json({
    cpu: {
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'Generic CPU',
      loadAvg: os.loadavg().map((l) => Number(l.toFixed(2))),
    },
    memory: {
      totalBytes: totalMem,
      freeBytes: freeMem,
      usedBytes: usedMem,
      usedPercent: memPercent,
    },
    disk: {
      totalBytes: totalDisk,
      freeBytes: freeDisk,
      usedBytes: usedDisk,
      usedPercent: diskPercent,
    },
    uptimeSeconds: os.uptime(),
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    nodeVersion: process.version,
    docker: {
      available: dockerAvailable,
      summary: dockerSummary,
    },
  });
});

// 2. Run Docker System Prune to reclaim disk space (MAIN ADMIN ONLY)
systemRouter.post('/docker/prune', requireMainAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const ip = getClientIp(req);

  try {
    const { stdout, stderr } = await execAsync('docker system prune -f', { timeout: 60000 });

    AuditService.log({
      userId: req.user!.id,
      username: req.user!.username,
      userRole: req.user!.role,
      ipAddress: ip,
      action: 'DOCKER_PRUNE_EXECUTED',
      target: 'Docker Engine',
      details: 'Executed "docker system prune -f" to reclaim disk space.',
    });

    res.json({
      message: 'Docker system prune completed successfully.',
      output: stdout || stderr,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Docker prune failed: ${err.message}` });
  }
});
