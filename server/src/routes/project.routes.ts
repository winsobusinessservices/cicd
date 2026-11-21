import { Router, Response } from 'express';
import path from 'path';
import { ProjectService } from '../services/project.service.js';
import { AuditService } from '../services/audit.service.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { requireMainAdmin } from '../middleware/role.middleware.js';

export const projectRouter = Router();

function getClientIp(req: any): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
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

  if (!cleanPath || !path.isAbsolute(cleanPath)) {
    res.status(400).json({ error: 'Project path must be a valid, absolute host path (e.g. D:\\app or /var/www/app).' });
    return;
  }

  try {
    const project = ProjectService.createProject({
      name: cleanName,
      description: typeof description === 'string' ? description.trim() : '',
      project_path: path.normalize(cleanPath),
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

  if (!cleanPath || !path.isAbsolute(cleanPath)) {
    res.status(400).json({ error: 'Project path must be a valid, absolute host path.' });
    return;
  }

  try {
    const updated = ProjectService.updateProject(id, {
      name: cleanName,
      description: typeof description === 'string' ? description.trim() : '',
      project_path: path.normalize(cleanPath),
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
