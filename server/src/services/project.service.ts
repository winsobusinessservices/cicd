import { db } from '../db/index.js';

export interface ProjectRow {
  id: number;
  name: string;
  slug: string;
  description: string;
  project_path: string;
  env_vars: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineStepRow {
  id: number;
  project_id: number;
  step_order: number;
  name: string;
  command: string;
  working_dir: string;
  is_enabled: number;
  continue_on_error: number;
  created_at: string;
  updated_at: string;
}

export interface StepInput {
  id?: number;
  step_order?: number;
  name: string;
  command: string;
  working_dir?: string;
  is_enabled?: boolean;
  continue_on_error?: boolean;
}

export class ProjectService {
  public static getAllProjects() {
    const projects = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM pipeline_steps WHERE project_id = p.id) as step_count,
        (SELECT status FROM deployments WHERE project_id = p.id ORDER BY id DESC LIMIT 1) as last_deploy_status,
        (SELECT started_at FROM deployments WHERE project_id = p.id ORDER BY id DESC LIMIT 1) as last_deploy_at
      FROM projects p
      ORDER BY p.updated_at DESC
    `).all() as unknown as any[];

    return projects.map((p) => ({
      ...p,
      env_vars: JSON.parse(p.env_vars || '{}'),
      step_count: Number(p.step_count || 0),
    }));
  }

  public static getProjectById(id: number) {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as unknown as ProjectRow | undefined;
    if (!project) return null;

    const steps = db.prepare(`
      SELECT * FROM pipeline_steps WHERE project_id = ? ORDER BY step_order ASC
    `).all(id) as unknown as PipelineStepRow[];

    return {
      ...project,
      env_vars: JSON.parse(project.env_vars || '{}'),
      steps: steps.map((s) => ({
        ...s,
        is_enabled: s.is_enabled === 1,
        continue_on_error: s.continue_on_error === 1,
      })),
    };
  }

  public static createProject(data: {
    name: string;
    description?: string;
    project_path: string;
    env_vars?: Record<string, string>;
    created_by: string;
    steps?: StepInput[];
  }) {
    const now = new Date().toISOString();
    const slug = data.name.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
    const envVarsStr = JSON.stringify(data.env_vars || {});

    const result = db.prepare(`
      INSERT INTO projects (name, slug, description, project_path, env_vars, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      slug,
      data.description || '',
      data.project_path,
      envVarsStr,
      data.created_by,
      now,
      now
    );

    const projectId = Number(result.lastInsertRowid);

    // If initial steps provided, save them
    if (data.steps && data.steps.length > 0) {
      this.savePipelineSteps(projectId, data.steps);
    }

    return this.getProjectById(projectId);
  }

  public static updateProject(id: number, data: {
    name?: string;
    description?: string;
    project_path?: string;
    env_vars?: Record<string, string>;
  }) {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as unknown as ProjectRow | undefined;
    if (!project) return null;

    const now = new Date().toISOString();
    const name = data.name ?? project.name;
    const description = data.description ?? project.description;
    const project_path = data.project_path ?? project.project_path;
    const env_vars = data.env_vars ? JSON.stringify(data.env_vars) : project.env_vars;

    db.prepare(`
      UPDATE projects
      SET name = ?, description = ?, project_path = ?, env_vars = ?, updated_at = ?
      WHERE id = ?
    `).run(name, description, project_path, env_vars, now, id);

    return this.getProjectById(id);
  }

  public static deleteProject(id: number): boolean {
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public static savePipelineSteps(projectId: number, steps: StepInput[]) {
    const now = new Date().toISOString();

    // Use transaction for atomic replacement of steps
    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare('DELETE FROM pipeline_steps WHERE project_id = ?').run(projectId);

      const insertStmt = db.prepare(`
        INSERT INTO pipeline_steps (project_id, step_order, name, command, working_dir, is_enabled, continue_on_error, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      steps.forEach((step, index) => {
        const order = index + 1;
        const isEnabled = step.is_enabled === false ? 0 : 1;
        const continueOnError = step.continue_on_error === true ? 1 : 0;
        insertStmt.run(
          projectId,
          order,
          step.name.trim(),
          step.command.trim(),
          (step.working_dir || '').trim(),
          isEnabled,
          continueOnError,
          now,
          now
        );
      });

      db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, projectId);
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    return this.getStepsByProjectId(projectId);
  }

  public static getStepsByProjectId(projectId: number) {
    const steps = db.prepare(`
      SELECT * FROM pipeline_steps WHERE project_id = ? ORDER BY step_order ASC
    `).all(projectId) as unknown as PipelineStepRow[];

    return steps.map((s) => ({
      ...s,
      is_enabled: s.is_enabled === 1,
      continue_on_error: s.continue_on_error === 1,
    }));
  }
}
