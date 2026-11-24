import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { ProjectService, ProjectRow } from '../services/project.service.js';
import { RunnerService } from '../services/runner.service.js';
import { AuditService } from '../services/audit.service.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { requireMainAdmin } from '../middleware/role.middleware.js';

export const webhookRouter = Router();

function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
}

function verifyHmacSha256(secret: string, rawBody: string, signatureHeader?: string): boolean {
  if (!secret) return true; // If no secret configured in project, allow
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

  try {
    const hmac = crypto.createHmac('sha256', secret);
    const expected = 'sha256=' + hmac.update(rawBody).digest('hex');
    const expectedBuf = Buffer.from(expected, 'utf-8');
    const actualBuf = Buffer.from(signatureHeader, 'utf-8');

    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

// 1. Inbound GitHub Webhook Receiver (Public endpoint, verified via HMAC)
webhookRouter.post('/github/:slug?', async (req: Request, res: Response): Promise<void> => {
  const slugParam = req.params.slug || (req.query.project as string) || (req.query.slug as string) || (req.query.id as string);
  const ip = getClientIp(req);

  if (!slugParam) {
    res.status(400).json({ error: 'Missing project identifier. Provide /github/:slug or ?project=slug' });
    return;
  }

  // Look up project by slug or ID
  let project: ProjectRow | undefined;
  if (/^\d+$/.test(slugParam)) {
    project = db.prepare('SELECT * FROM projects WHERE id = ?').get(parseInt(slugParam, 10)) as unknown as ProjectRow | undefined;
  } else {
    project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(slugParam) as unknown as ProjectRow | undefined;
  }

  if (!project) {
    res.status(404).json({ error: `Project "${slugParam}" not found.` });
    return;
  }

  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  // Verify HMAC signature if secret is configured
  if (project.webhook_secret && project.webhook_secret.trim() !== '') {
    const isValid = verifyHmacSha256(project.webhook_secret, rawBody, signature);
    if (!isValid) {
      AuditService.log({
        userId: null,
        username: 'GitHub Webhook (Unauthenticated)',
        userRole: 'SYSTEM',
        ipAddress: ip,
        action: 'WEBHOOK_SIGNATURE_FAILED',
        target: `Project: "${project.name}" (#${project.id})`,
        details: 'Rejected inbound webhook request due to invalid HMAC SHA-256 signature.',
      });
      res.status(401).json({ error: 'Invalid HMAC SHA-256 signature header (x-hub-signature-256).' });
      return;
    }
  }

  const eventType = (req.headers['x-github-event'] as string) || 'push';

  // Handle GitHub Ping event
  if (eventType === 'ping') {
    const zen = req.body.zen || 'Webhook connected!';
    res.json({ message: 'Pong! Webhook connected successfully.', zen, project: project.name });
    return;
  }

  // Handle GitHub Push event
  if (eventType === 'push') {
    const ref = req.body.ref || '';
    const branch = ref.replace('refs/heads/', '');
    const sender = req.body.pusher?.name || req.body.sender?.login || 'GitHub';
    const headCommit = req.body.head_commit || req.body.commits?.[0] || {};
    const commitHash = (headCommit.id || '').substring(0, 7);
    const commitMessage = (headCommit.message || 'Auto-deploy from push').split('\n')[0].substring(0, 100);
    const now = new Date().toISOString();

    const targetBranch = project.webhook_branch || 'main';

    // Check if auto-deploy is enabled
    if (!project.webhook_enabled) {
      db.prepare(`
        INSERT INTO webhook_events (project_id, event_type, sender_username, commit_hash, commit_message, branch, status, received_at)
        VALUES (?, 'push', ?, ?, ?, ?, 'DISABLED', ?)
      `).run(project.id, sender, commitHash, commitMessage, branch, now);

      res.json({
        message: 'Webhook received but auto-deploy is disabled for this project.',
        project: project.name,
        branch,
      });
      return;
    }

    // Check if branch matches
    if (branch !== targetBranch) {
      db.prepare(`
        INSERT INTO webhook_events (project_id, event_type, sender_username, commit_hash, commit_message, branch, status, received_at)
        VALUES (?, 'push', ?, ?, ?, ?, 'SKIPPED_BRANCH', ?)
      `).run(project.id, sender, commitHash, commitMessage, branch, now);

      res.json({
        message: `Push ignored: branch "${branch}" does not match configured deploy branch "${targetBranch}".`,
        project: project.name,
      });
      return;
    }

    // Record webhook event
    db.prepare(`
      INSERT INTO webhook_events (project_id, event_type, sender_username, commit_hash, commit_message, branch, status, received_at)
      VALUES (?, 'push', ?, ?, ?, ?, 'TRIGGERED', ?)
    `).run(project.id, sender, commitHash, commitMessage, branch, now);

    try {
      const deploy = await RunnerService.startDeployment({
        projectId: project.id,
        userId: 0,
        username: `GitHub Webhook (@${sender})`,
        userRole: 'MAIN_ADMIN',
        ipAddress: ip,
        triggerType: 'WEBHOOK',
        commitHash,
        commitMessage,
      });

      res.json({
        message: 'Deployment triggered successfully via GitHub Webhook.',
        deploymentId: deploy.id,
        branch,
        commit: commitHash,
      });
    } catch (err: any) {
      res.status(500).json({ error: `Failed to trigger deployment: ${err.message}` });
    }
    return;
  }

  res.json({ message: `Received unhandled GitHub event: ${eventType}` });
});

// 2. Get Webhook Delivery History for a project (Authenticated)
webhookRouter.get('/history/:projectId', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) {
    res.status(400).json({ error: 'Invalid project ID.' });
    return;
  }

  const events = db.prepare(`
    SELECT * FROM webhook_events WHERE project_id = ? ORDER BY id DESC LIMIT 20
  `).all(projectId);

  res.json(events);
});

// 3. Generate a secure random webhook secret (MAIN ADMIN ONLY)
webhookRouter.post('/generate-secret', requireAuth, requireMainAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const secret = crypto.randomBytes(24).toString('hex');
  res.json({ secret });
});
