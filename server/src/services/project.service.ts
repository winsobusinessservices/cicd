import fs from 'fs';
import path from 'path';
import { db } from '../db/index.js';
import { ROOT_DIR } from '../config.js';

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
  webhook_secret?: string;
  webhook_branch?: string;
  webhook_enabled?: number;
  schedule_cron?: string;
  schedule_enabled?: number;
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
  /**
   * Consistently resolve a project directory path.
   * Strips quotes, handles pointing to a .env file directly, and resolves relative paths from ROOT_DIR.
   */
  public static resolveProjectPath(projectPath: string): string {
    if (!projectPath) return ROOT_DIR;
    let clean = projectPath.replace(/^["']|["']$/g, '').trim();
    if (clean.endsWith('.env')) {
      clean = path.dirname(clean);
    }
    return path.isAbsolute(clean) ? path.normalize(clean) : path.resolve(ROOT_DIR, clean);
  }

  /**
   * Get the exact physical .env file path on the host server for a project.
   */
  public static getEnvFilePath(projectPath: string): string {
    const dir = this.resolveProjectPath(projectPath);
    return path.join(dir, '.env');
  }

  /**
   * Parse a physical .env file from disk into a key-value record.
   * Handles windows/linux linebreaks, quotes, spaces, and comments.
   */
  public static parseEnvFile(filePath: string): Record<string, string> {
    try {
      if (!fs.existsSync(filePath)) return {};
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split(/\r?\n/);
      const vars: Record<string, string> = {};
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          // Strip surrounding quotes
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (key) {
            vars[key] = val;
          }
        }
      }
      return vars;
    } catch (err: any) {
      console.warn(`[ProjectService] Could not parse .env at ${filePath}:`, err.message);
      return {};
    }
  }

  /**
   * Physically write and synchronize the .env file in the host project folder.
   * Throws an error if disk write fails so it never fails silently.
   */
  public static syncEnvFileToDisk(projectPath: string, envVars: Record<string, string>, projectName?: string): { success: boolean; filePath: string } {
    if (!projectPath) throw new Error('Project path is empty.');
    const envFilePath = this.getEnvFilePath(projectPath);
    const dir = path.dirname(envFilePath);

    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const lines: string[] = [
        `# Auto-generated & Synced by Varex CI/CD Platform`,
        `# Project: ${projectName || 'Varex Project'}`,
        `# Last Synced: ${new Date().toISOString()}`,
        '',
      ];

      for (const [key, value] of Object.entries(envVars || {})) {
        const cleanKey = key.trim();
        if (!cleanKey) continue;
        const stringVal = String(value ?? '');
        // Quote values that have spaces, newlines, quotes, or hashes
        const needsQuotes = stringVal.includes(' ') || stringVal.includes('\n') || stringVal.includes('"') || stringVal.includes('#');
        const formattedVal = needsQuotes ? `"${stringVal.replace(/"/g, '\\"')}"` : stringVal;
        lines.push(`${cleanKey}=${formattedVal}`);
      }

      fs.writeFileSync(envFilePath, lines.join('\n') + '\n', 'utf-8');
      return { success: true, filePath: envFilePath };
    } catch (err: any) {
      console.error(`[ProjectService] Failed to write .env file to ${envFilePath}:`, err.message);
      throw new Error(`Failed to write .env file to "${envFilePath}": ${err.message}`);
    }
  }

  public static getAllProjects() {
    const projects = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM pipeline_steps WHERE project_id = p.id) as step_count,
        (SELECT status FROM deployments WHERE project_id = p.id ORDER BY id DESC LIMIT 1) as last_deploy_status,
        (SELECT started_at FROM deployments WHERE project_id = p.id ORDER BY id DESC LIMIT 1) as last_deploy_at
      FROM projects p
      ORDER BY p.updated_at DESC
    `).all() as unknown as any[];

    return projects.map((p) => {
      const envFilePath = this.getEnvFilePath(p.project_path);
      const envFileExists = fs.existsSync(envFilePath);
      let envFileMtime: string | null = null;

      let envVars: Record<string, string> = {};
      try {
        envVars = JSON.parse(p.env_vars || '{}');
      } catch {
        envVars = {};
      }

      // Check if physical .env exists on disk and synchronize
      if (envFileExists) {
        try {
          const stat = fs.statSync(envFilePath);
          envFileMtime = stat.mtime.toISOString();
          const diskVars = this.parseEnvFile(envFilePath);
          if (Object.keys(diskVars).length > 0) {
            envVars = { ...envVars, ...diskVars };
          }
        } catch {
          // ignore
        }
      }

      return {
        ...p,
        env_vars: envVars,
        env_file_path: envFilePath,
        env_file_exists: envFileExists,
        env_file_mtime: envFileMtime,
        step_count: Number(p.step_count || 0),
      };
    });
  }

  public static getProjectById(id: number) {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as unknown as ProjectRow | undefined;
    if (!project) return null;

    const envFilePath = this.getEnvFilePath(project.project_path);
    const envFileExists = fs.existsSync(envFilePath);
    let envFileMtime: string | null = null;

    let dbEnvVars: Record<string, string> = {};
    try {
      dbEnvVars = JSON.parse(project.env_vars || '{}');
    } catch {
      dbEnvVars = {};
    }

    let finalEnvVars = { ...dbEnvVars };

    if (envFileExists) {
      try {
        const stat = fs.statSync(envFilePath);
        envFileMtime = stat.mtime.toISOString();
        const diskVars = this.parseEnvFile(envFilePath);

        // If disk file has variables, merge so server edits take immediate effect
        if (Object.keys(diskVars).length > 0) {
          finalEnvVars = { ...dbEnvVars, ...diskVars };

          // Keep SQLite up to date with the server disk state
          const mergedStr = JSON.stringify(finalEnvVars);
          if (mergedStr !== project.env_vars) {
            db.prepare('UPDATE projects SET env_vars = ? WHERE id = ?').run(mergedStr, id);
          }
        }
      } catch (err: any) {
        console.warn(`[ProjectService] Could not inspect disk .env at ${envFilePath}:`, err.message);
      }
    } else if (Object.keys(dbEnvVars).length > 0) {
      // File does not exist on disk yet, but DB has variables -> write out to disk so they stay in sync
      try {
        this.syncEnvFileToDisk(project.project_path, dbEnvVars, project.name);
        envFileMtime = new Date().toISOString();
      } catch (err: any) {
        console.warn(`[ProjectService] Could not auto-sync .env to disk:`, err.message);
      }
    }

    const steps = db.prepare(`
      SELECT * FROM pipeline_steps WHERE project_id = ? ORDER BY step_order ASC
    `).all(id) as unknown as PipelineStepRow[];

    return {
      ...project,
      env_vars: finalEnvVars,
      env_file_path: envFilePath,
      env_file_exists: fs.existsSync(envFilePath),
      env_file_mtime: envFileMtime,
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
    const resolvedPath = this.resolveProjectPath(data.project_path);

    let envVarsToUse = data.env_vars || {};
    // If no env vars supplied in form, read existing .env on disk if present
    const envFilePath = this.getEnvFilePath(resolvedPath);
    if (Object.keys(envVarsToUse).length === 0 && fs.existsSync(envFilePath)) {
      envVarsToUse = this.parseEnvFile(envFilePath);
    }

    const envVarsStr = JSON.stringify(envVarsToUse);

    const result = db.prepare(`
      INSERT INTO projects (name, slug, description, project_path, env_vars, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      slug,
      data.description || '',
      resolvedPath,
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

    // Sync physical .env file to host directory
    if (Object.keys(envVarsToUse).length > 0) {
      try {
        this.syncEnvFileToDisk(resolvedPath, envVarsToUse, data.name);
      } catch (err: any) {
        console.warn(`[ProjectService] Could not write initial .env file:`, err.message);
      }
    }

    return this.getProjectById(projectId);
  }

  public static updateProject(id: number, data: {
    name?: string;
    description?: string;
    project_path?: string;
    env_vars?: Record<string, string>;
    webhook_secret?: string;
    webhook_branch?: string;
    webhook_enabled?: boolean;
    schedule_cron?: string;
    schedule_enabled?: boolean;
  }) {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as unknown as ProjectRow | undefined;
    if (!project) return null;

    const now = new Date().toISOString();
    const name = data.name ?? project.name;
    const description = data.description ?? project.description;
    const resolvedPath = data.project_path ? this.resolveProjectPath(data.project_path) : project.project_path;
    const env_vars = data.env_vars ? JSON.stringify(data.env_vars) : project.env_vars;

    const webhook_secret = data.webhook_secret !== undefined ? data.webhook_secret : (project.webhook_secret || '');
    const webhook_branch = data.webhook_branch !== undefined ? data.webhook_branch : (project.webhook_branch || 'main');
    const webhook_enabled = data.webhook_enabled !== undefined ? (data.webhook_enabled ? 1 : 0) : (project.webhook_enabled || 0);
    const schedule_cron = data.schedule_cron !== undefined ? data.schedule_cron : (project.schedule_cron || '');
    const schedule_enabled = data.schedule_enabled !== undefined ? (data.schedule_enabled ? 1 : 0) : (project.schedule_enabled || 0);

    db.prepare(`
      UPDATE projects
      SET name = ?, description = ?, project_path = ?, env_vars = ?,
          webhook_secret = ?, webhook_branch = ?, webhook_enabled = ?,
          schedule_cron = ?, schedule_enabled = ?, updated_at = ?
      WHERE id = ?
    `).run(
      name, description, resolvedPath, env_vars,
      webhook_secret, webhook_branch, webhook_enabled,
      schedule_cron, schedule_enabled, now,
      id
    );

    // Sync to disk if env_vars was provided
    if (data.env_vars) {
      this.syncEnvFileToDisk(resolvedPath, data.env_vars, name);
    }

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

  /**
   * Update project environment variables, save to DB, and physically write .env to project folder
   */
  public static updateProjectEnvVars(id: number, envVars: Record<string, string>) {
    const now = new Date().toISOString();
    const envVarsStr = JSON.stringify(envVars || {});
    db.prepare(`
      UPDATE projects
      SET env_vars = ?, updated_at = ?
      WHERE id = ?
    `).run(envVarsStr, now, id);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as unknown as ProjectRow | undefined;
    if (project && project.project_path) {
      this.syncEnvFileToDisk(project.project_path, envVars, project.name);
    }

    return this.getProjectById(id);
  }

  /**
   * Reload environment variables directly from the host server physical .env file into the DB
   */
  public static syncProjectEnvFromDisk(id: number) {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as unknown as ProjectRow | undefined;
    if (!project) throw new Error('Project not found');

    const envFilePath = this.getEnvFilePath(project.project_path);
    if (!fs.existsSync(envFilePath)) {
      // If it doesn't exist on disk, generate it from DB
      let currentVars: Record<string, string> = {};
      try {
        currentVars = JSON.parse(project.env_vars || '{}');
      } catch {
        currentVars = {};
      }
      this.syncEnvFileToDisk(project.project_path, currentVars, project.name);
    } else {
      // Disk file exists: read it and persist to DB
      const diskVars = this.parseEnvFile(envFilePath);
      const now = new Date().toISOString();
      db.prepare('UPDATE projects SET env_vars = ?, updated_at = ? WHERE id = ?').run(
        JSON.stringify(diskVars),
        now,
        id
      );
    }

    return this.getProjectById(id);
  }
}
