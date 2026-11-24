import { Router, Response } from 'express';
import { RunnerService } from '../services/runner.service.js';
import { ProjectService } from '../services/project.service.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const deployRouter = Router();

function getClientIp(req: any): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
}

deployRouter.use(requireAuth);

// 1. Trigger deployment
deployRouter.post('/project/:projectId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const projectId = parseInt(req.params.projectId, 10);
  const ip = getClientIp(req);

  const project = ProjectService.getProjectById(projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  try {
    const deployment = await RunnerService.startDeployment({
      projectId,
      userId: req.user!.id,
      username: req.user!.username,
      userRole: req.user!.role,
      ipAddress: ip,
    });

    res.status(202).json({
      message: `Deployment started for "${project.name}".`,
      deployment,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Abort running deployment
deployRouter.post('/:deploymentId/abort', (req: AuthenticatedRequest, res: Response): void => {
  const deploymentId = parseInt(req.params.deploymentId, 10);
  const ip = getClientIp(req);

  const success = RunnerService.abortDeployment(deploymentId, {
    id: req.user!.id,
    username: req.user!.username,
    role: req.user!.role,
    ip,
  });

  if (!success) {
    res.status(404).json({ error: 'Deployment is not actively running or could not be found.' });
    return;
  }

  res.json({ message: `Deployment #${deploymentId} abort command dispatched.` });
});

// 3. Get single deployment status and full logs
deployRouter.get('/:deploymentId', (req: AuthenticatedRequest, res: Response): void => {
  const deploymentId = parseInt(req.params.deploymentId, 10);
  const deployment = RunnerService.getDeploymentById(deploymentId);

  if (!deployment) {
    res.status(404).json({ error: 'Deployment not found.' });
    return;
  }

  res.json(deployment);
});

// 4. Get deployment history for a project
deployRouter.get('/project/:projectId/history', (req: AuthenticatedRequest, res: Response) => {
  const projectId = parseInt(req.params.projectId, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;

  const history = RunnerService.getDeploymentsByProjectId(projectId, limit);
  res.json(history);
});

// 5. One-Click Rollback to a previous deployment run
deployRouter.post('/rollback/:deploymentId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const targetDepId = parseInt(req.params.deploymentId, 10);
  const ip = getClientIp(req);

  const targetDeployment = RunnerService.getDeploymentById(targetDepId);
  if (!targetDeployment) {
    res.status(404).json({ error: 'Target deployment for rollback not found.' });
    return;
  }

  const project = ProjectService.getProjectById(targetDeployment.project_id);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  try {
    const deployment = await RunnerService.startDeployment({
      projectId: targetDeployment.project_id,
      userId: req.user!.id,
      username: req.user!.username,
      userRole: req.user!.role,
      ipAddress: ip,
      triggerType: 'ROLLBACK',
      rollbackFromId: targetDepId,
      commitHash: targetDeployment.commit_hash || '',
      commitMessage: `Rollback to Run #${targetDepId} (${targetDeployment.commit_message || 'previous stable build'})`,
    });

    res.status(202).json({
      message: `Rollback deployment started for "${project.name}" (reverting to #${targetDepId}).`,
      deployment,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
