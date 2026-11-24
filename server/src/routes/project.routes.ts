import { Router, Response } from 'express';
import path from 'path';
import { ProjectService } from '../services/project.service.js';
import { ServiceLogService } from '../services/service-log.service.js';
import { AuditService } from '../services/audit.service.js';
import { AuthService } from '../services/auth.service.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { requireMainAdmin } from '../middleware/role.middleware.js';

export const projectRouter = Router();

function getClientIp(req: any): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
}

function areEnvVarsEqual(a?: Record<string, string>, b?: Record<string, string>): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a).filter((k) => k.trim());
  const keysB = Object.keys(b).filter((k) => k.trim());
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if ((a[key] ?? '') !== (b[key] ?? '')) return false;
  }
  return true;
}

projectRouter.use(requireAuth);

// 1. List all projects (Main Admin & Sub Admin)
projectRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const projects = ProjectService.getAllProjects();
  res.json(projects);
});

// 2. Get single project with steps (Main Admin & Sub Admin)
projectRouter.get('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid project ID.' });
    return;
  }
  const project = ProjectService.getProjectById(id);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  res.json(project);
});

// 3. Create new project (MAIN ADMIN ONLY)
projectRouter.post('/', requireMainAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const { name, description, project_path, env_vars, steps } = req.body;
  const ip = getClientIp(req);

  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanPath = typeof project_path === 'string' ? project_path.trim() : '';

  if (!cleanName || cleanName.length < 2 || cleanName.length > 80) {
    res.status(400).json({ error: 'Project name must be between 2 and 80 characters.' });
    return;
  }

  const unquotedPath = cleanPath.replace(/^["']|["']$/g, '').trim();
  if (!unquotedPath) {
    res.status(400).json({ error: 'Project path cannot be empty.' });
    return;
  }
  const resolvedPath = ProjectService.resolveProjectPath(unquotedPath);

  try {
    const project = ProjectService.createProject({
      name: cleanName,
      description: typeof description === 'string' ? description.trim() : '',
      project_path: resolvedPath,
      env_vars,
      created_by: req.user!.username,
      steps,
    });

    AuditService.log({
      userId: req.user!.id,
      username: req.user!.username,
      userRole: req.user!.role,
      ipAddress: ip,
      action: 'PROJECT_CREATED',
      target: `Project: "${cleanName}" (#${project!.id})`,
      details: `Project registered with path "${cleanPath}" and ${project!.steps.length} steps.`,
    });

    res.status(201).json(project);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to create project: ${err.message}` });
  }
});

// 4. Update project details (MAIN ADMIN ONLY)
projectRouter.put('/:id', requireMainAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  const { name, description, project_path, env_vars } = req.body;
  const ip = getClientIp(req);

  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanPath = typeof project_path === 'string' ? project_path.trim() : '';

  if (!cleanName || cleanName.length < 2 || cleanName.length > 80) {
    res.status(400).json({ error: 'Project name must be between 2 and 80 characters.' });
    return;
  }

  const unquotedPath = cleanPath.replace(/^["']|["']$/g, '').trim();
  if (!unquotedPath) {
    res.status(400).json({ error: 'Project path cannot be empty.' });
    return;
  }
  const resolvedPath = ProjectService.resolveProjectPath(unquotedPath);

  try {
    const existing = ProjectService.getProjectById(id);
    if (!existing) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    // If env_vars are being modified, require elevated sudo password verification
    if (env_vars !== undefined) {
      const hasChanged = !areEnvVarsEqual(existing.env_vars, env_vars);
      if (hasChanged) {
        const sudoPassword = req.body.sudoPassword;
        if (!sudoPassword || !AuthService.verifySudoElevation(sudoPassword, req.user!.id)) {
          AuditService.log({
            userId: req.user!.id,
            username: req.user!.username,
            userRole: req.user!.role,
            ipAddress: ip,
            action: 'ELEVATED_AUTH_FAILED',
            target: `Project: "${existing.name}" (#${id})`,
            details: 'Sudo password verification failed when attempting to update project environment variables.',
          });
          res.status(403).json({ error: 'Elevated authorization required: Valid sudo password needed to modify environment variables.' });
          return;
        }
      }
    }

    const updated = ProjectService.updateProject(id, {
      name: cleanName,
      description: typeof description === 'string' ? description.trim() : '',
      project_path: resolvedPath,
      env_vars,
    });

    if (!updated) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    AuditService.log({
      userId: req.user!.id,
      username: req.user!.username,
      userRole: req.user!.role,
      ipAddress: ip,
      action: 'PROJECT_UPDATED',
      target: `Project: "${updated.name}" (#${id})`,
      details: `Project settings updated.`,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to update project: ${err.message}` });
  }
});

// 5. Delete project (MAIN ADMIN ONLY)
projectRouter.delete('/:id', requireMainAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  const ip = getClientIp(req);

  const existing = ProjectService.getProjectById(id);
  if (!existing) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const success = ProjectService.deleteProject(id);
  if (!success) {
    res.status(500).json({ error: 'Failed to delete project.' });
    return;
  }

  AuditService.log({
    userId: req.user!.id,
    username: req.user!.username,
    userRole: req.user!.role,
    ipAddress: ip,
    action: 'PROJECT_DELETED',
    target: `Project: "${existing.name}" (#${id})`,
    details: `Project and associated pipeline steps deleted.`,
  });

  res.json({ message: 'Project deleted successfully.' });
});

// 6. Save / Replace pipeline steps for a project (MAIN ADMIN ONLY)
projectRouter.put('/:id/steps', requireMainAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  const steps = req.body.steps;
  const ip = getClientIp(req);

  if (!Array.isArray(steps)) {
    res.status(400).json({ error: 'Steps must be an array of pipeline step definitions.' });
    return;
  }

  const project = ProjectService.getProjectById(id);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  // Validate each step
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (!s.command || typeof s.command !== 'string' || s.command.trim() === '') {
      res.status(400).json({ error: `Step #${i + 1} is missing a command.` });
      return;
    }
  }

  try {
    const savedSteps = ProjectService.savePipelineSteps(id, steps);

    AuditService.log({
      userId: req.user!.id,
      username: req.user!.username,
      userRole: req.user!.role,
      ipAddress: ip,
      action: 'PIPELINE_STEPS_UPDATED',
      target: `Project: "${project.name}" (#${id})`,
      details: `Saved ${savedSteps.length} pipeline steps.`,
    });

    res.json({ message: 'Pipeline steps saved successfully.', steps: savedSteps });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to save steps: ${err.message}` });
  }
});

// 7. Update Project Environment Variables & Secrets with SUDO elevation (MAIN ADMIN ONLY)
projectRouter.put('/:id/env', requireMainAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  const { env_vars, sudoPassword } = req.body;
  const ip = getClientIp(req);

  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid project ID.' });
    return;
  }

  const project = ProjectService.getProjectById(id);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  if (!sudoPassword || typeof sudoPassword !== 'string') {
    res.status(400).json({ error: 'Server sudo password is required to modify environment variables.' });
    return;
  }

  const isAuthorized = AuthService.verifySudoElevation(sudoPassword, req.user!.id);
  if (!isAuthorized) {
    AuditService.log({
      userId: req.user!.id,
      username: req.user!.username,
      userRole: req.user!.role,
      ipAddress: ip,
      action: 'ELEVATED_AUTH_FAILED',
      target: `Project: "${project.name}" (#${id})`,
      details: 'Failed sudo authorization attempt while trying to update environment variables.',
    });
    res.status(403).json({ error: 'Access denied: Invalid server sudo / administrator password.' });
    return;
  }

  try {
    const updated = ProjectService.updateProjectEnvVars(id, env_vars || {});

    AuditService.log({
      userId: req.user!.id,
      username: req.user!.username,
      userRole: req.user!.role,
      ipAddress: ip,
      action: 'PROJECT_ENV_UPDATED',
      target: `Project: "${project.name}" (#${id})`,
      details: `Environment variables updated with verified sudo authorization (${Object.keys(env_vars || {}).length} variables configured).`,
    });

    res.json({
      message: `Environment variables updated and synchronized to ${updated?.env_file_path || 'disk'}.`,
      project: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to update environment variables: ${err.message}` });
  }
});

// 8. Explicitly reload / sync .env from host server disk (MAIN ADMIN ONLY)
projectRouter.post('/:id/env/sync', requireMainAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  const ip = getClientIp(req);

  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid project ID.' });
    return;
  }

  const project = ProjectService.getProjectById(id);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  try {
    const synced = ProjectService.syncProjectEnvFromDisk(id);

    AuditService.log({
      userId: req.user!.id,
      username: req.user!.username,
      userRole: req.user!.role,
      ipAddress: ip,
      action: 'PROJECT_ENV_SYNCED',
      target: `Project: "${project.name}" (#${id})`,
      details: `Reloaded and synchronized environment variables from server file "${synced?.env_file_path}".`,
    });

    res.json({
      message: `Successfully synchronized environment variables from server file: ${synced?.env_file_path}`,
      project: synced,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to sync environment variables from disk: ${err.message}` });
  }
});

// 9. List services for a project (Main Admin & Sub Admin)
projectRouter.get('/:id/services', (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid project ID.' });
    return;
  }
  const services = ServiceLogService.getServicesByProjectId(id);
  const enriched = services.map((s) => {
    const state = ServiceLogService.getStreamState(s.id);
    return {
      ...s,
      status: state.status,
      startedAt: state.startedAt,
    };
  });
  res.json(enriched);
});

// 10. Save / replace services for a project (MAIN ADMIN ONLY)
projectRouter.put('/:id/services', requireMainAdmin, (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  const services = req.body.services;
  const ip = getClientIp(req);

  if (isNaN(id) || !Array.isArray(services)) {
    res.status(400).json({ error: 'Services must be an array of service definitions.' });
    return;
  }

  const project = ProjectService.getProjectById(id);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  for (let i = 0; i < services.length; i++) {
    const s = services[i];
    if (!s.name || typeof s.name !== 'string' || s.name.trim() === '') {
      res.status(400).json({ error: `Service #${i + 1} is missing a name.` });
      return;
    }
    if (!s.log_command || typeof s.log_command !== 'string' || s.log_command.trim() === '') {
      res.status(400).json({ error: `Service "${s.name}" is missing a log command.` });
      return;
    }
  }

  try {
    const saved = ServiceLogService.saveServices(id, services);

    AuditService.log({
      userId: req.user!.id,
      username: req.user!.username,
      userRole: req.user!.role,
      ipAddress: ip,
      action: 'PROJECT_SERVICES_UPDATED',
      target: `Project: "${project.name}" (#${id})`,
      details: `Saved ${saved.length} service terminals for live log streaming.`,
    });

    res.json({ message: 'Services saved successfully.', services: saved });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to save services: ${err.message}` });
  }
});

// 11. Start live log streaming for a service
projectRouter.post('/:id/services/:serviceId/start', (req: AuthenticatedRequest, res: Response): void => {
  const serviceId = parseInt(req.params.serviceId, 10);
  if (isNaN(serviceId)) {
    res.status(400).json({ error: 'Invalid service ID.' });
    return;
  }
  try {
    const stream = ServiceLogService.startStream(serviceId);
    res.json(stream);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Stop live log streaming for a service
projectRouter.post('/:id/services/:serviceId/stop', (req: AuthenticatedRequest, res: Response): void => {
  const serviceId = parseInt(req.params.serviceId, 10);
  if (isNaN(serviceId)) {
    res.status(400).json({ error: 'Invalid service ID.' });
    return;
  }
  try {
    ServiceLogService.stopStream(serviceId);
    res.json({ status: 'STOPPED', message: 'Stream stopped.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Get buffered logs and stream status for a service
projectRouter.get('/:id/services/:serviceId/logs', (req: AuthenticatedRequest, res: Response): void => {
  const serviceId = parseInt(req.params.serviceId, 10);
  if (isNaN(serviceId)) {
    res.status(400).json({ error: 'Invalid service ID.' });
    return;
  }
  try {
    const state = ServiceLogService.getStreamState(serviceId);
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Clear buffered logs for a service
projectRouter.post('/:id/services/:serviceId/clear', (req: AuthenticatedRequest, res: Response): void => {
  const serviceId = parseInt(req.params.serviceId, 10);
  if (isNaN(serviceId)) {
    res.status(400).json({ error: 'Invalid service ID.' });
    return;
  }
  ServiceLogService.clearBuffer(serviceId);
  res.json({ message: 'Buffer cleared.' });
});
