import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index.js';
import { WsManager } from '../websocket.js';
import { AuditService } from './audit.service.js';
import { ProjectService, ProjectRow, PipelineStepRow } from './project.service.js';

export interface DeploymentRow {
  id: number;
  project_id: number;
  project_name: string;
  triggered_by_user_id: number;
  triggered_by_username: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'ABORTED';
  started_at: string;
  finished_at: string | null;
  duration_ms: number;
  exit_code: number | null;
  logs: string;
  error_message: string | null;
}

export class RunnerService {
  private static activeRuns: Map<number, { process: ChildProcess | null; aborted: boolean }> = new Map();

  public static async startDeployment(options: {
    projectId: number;
    userId: number;
    username: string;
    userRole: string;
    ipAddress: string;
  }): Promise<DeploymentRow> {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(options.projectId) as unknown as ProjectRow | undefined;
    if (!project) {
      throw new Error(`Project #${options.projectId} not found.`);
    }

    const steps = db.prepare(`
      SELECT * FROM pipeline_steps WHERE project_id = ? AND is_enabled = 1 ORDER BY step_order ASC
    `).all(options.projectId) as unknown as PipelineStepRow[];

    if (steps.length === 0) {
      throw new Error(`Project "${project.name}" has no enabled pipeline steps to execute.`);
    }

    const now = new Date().toISOString();

    // Create deployment record
    const result = db.prepare(`
      INSERT INTO deployments (project_id, project_name, triggered_by_user_id, triggered_by_username, status, started_at, logs)
      VALUES (?, ?, ?, ?, 'RUNNING', ?, '')
    `).run(
      project.id,
      project.name,
      options.userId,
      options.username,
      now
    );

    const deploymentId = Number(result.lastInsertRowid);
    const deployRecord = db.prepare('SELECT * FROM deployments WHERE id = ?').get(deploymentId) as unknown as DeploymentRow;

    // Register active run
    this.activeRuns.set(deploymentId, { process: null, aborted: false });

    // Audit log start
    AuditService.log({
      userId: options.userId,
      username: options.username,
      userRole: options.userRole,
      ipAddress: options.ipAddress,
      action: 'DEPLOY_START',
      target: `Project: "${project.name}" (#${project.id})`,
      details: `Started deployment run #${deploymentId} with ${steps.length} steps.`,
    });

    // Execute in background so the API returns immediately
    setImmediate(() => {
      this.executePipeline(deploymentId, project, steps, options);
    });

    return deployRecord;
  }

  private static async executePipeline(
    deploymentId: number,
    project: ProjectRow,
    steps: PipelineStepRow[],
    options: { userId: number; username: string; userRole: string; ipAddress: string }
  ) {
    const startTime = Date.now();
    let accumulatedLogs = '';

    const appendLog = (stream: 'stdout' | 'stderr' | 'system', text: string, stepIndex?: number, stepName?: string) => {
      accumulatedLogs += text;
      try {
        db.prepare('UPDATE deployments SET logs = ? WHERE id = ?').run(accumulatedLogs, deploymentId);
      } catch {
        // ignore
      }
      WsManager.broadcastDeployLog(deploymentId, {
        stream,
        text,
        stepIndex,
        stepName
      });
    };

    // Ensure working directory exists on host
    try {
      if (!fs.existsSync(project.project_path)) {
        fs.mkdirSync(project.project_path, { recursive: true });
      }
    } catch (err: any) {
      appendLog('stderr', `Failed to access project path: ${err.message}\n`);
      this.finishDeployment(deploymentId, 'FAILED', Date.now() - startTime, accumulatedLogs, 1, err.message, options, project);
      return;
    }

    // Parse custom environment variables (first load from DB, then merge latest from disk if present)
    let envVars: Record<string, string> = {};
    try {
      envVars = JSON.parse(project.env_vars || '{}');
    } catch {
      // ignore
    }

    const envFilePath = ProjectService.getEnvFilePath(project.project_path);
    if (fs.existsSync(envFilePath)) {
      try {
        const diskVars = ProjectService.parseEnvFile(envFilePath);
        if (Object.keys(diskVars).length > 0) {
          envVars = { ...envVars, ...diskVars };
        }
      } catch {
        // ignore
      }
    } else if (Object.keys(envVars).length > 0) {
      try {
        ProjectService.syncEnvFileToDisk(project.project_path, envVars, project.name);
      } catch {
        // ignore
      }
    }

    // Security: Filter out dangerous runtime-hooking environment variables from injected project env
    const BLOCKED_PROCESS_HOOKS = new Set([
      'NODE_OPTIONS',
      'LD_PRELOAD',
      'LD_LIBRARY_PATH',
      'DYLD_INSERT_LIBRARIES',
      'DYLD_LIBRARY_PATH',
      'PYTHONPATH',
      'PERL5OPT',
      'RUBYOPT',
      'BASH_ENV',
      'ENV',
    ]);

    const sanitizedEnvVars: Record<string, string> = {};
    for (const [key, value] of Object.entries(envVars)) {
      if (BLOCKED_PROCESS_HOOKS.has(key.toUpperCase().trim())) {
        appendLog('stderr', `[SECURITY WARNING] Blocked dangerous process-hooking variable: "${key}".\n`);
        continue;
      }
      sanitizedEnvVars[key] = value;
    }

    const mergedEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ...sanitizedEnvVars,
      GIT_TERMINAL_PROMPT: '0',
      VAREX_DEPLOYMENT_ID: deploymentId.toString(),
      VAREX_PROJECT_NAME: project.name,
      VAREX_PROJECT_PATH: project.project_path,
    };

    let overallSuccess = true;
    let failedErrorMessage: string | null = null;
    let finalExitCode = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepNum = i + 1;
      const runRef = this.activeRuns.get(deploymentId);

      if (runRef?.aborted) {
        appendLog('system', `Process canceled by user.\n`);
        overallSuccess = false;
        failedErrorMessage = 'Deployment was aborted by user.';
        finalExitCode = 130;
        break;
      }

      // Clean command prompt like GitHub Actions (no noisy banners)
      appendLog('system', `$ ${step.command}\n`, stepNum, step.name);

      WsManager.broadcastDeployStatus(deploymentId, 'RUNNING_STEP', {
        currentStep: stepNum,
        totalSteps: steps.length,
        stepName: step.name,
      });

      const projectRoot = path.resolve(project.project_path);
      let stepWorkingDir = projectRoot;
      if (step.working_dir && step.working_dir.trim() !== '') {
        const resolved = path.resolve(projectRoot, step.working_dir);
        const relative = path.relative(projectRoot, resolved);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          overallSuccess = false;
          finalExitCode = 1;
          failedErrorMessage = `Security Error: Step working directory "${step.working_dir}" escapes project root.`;
          appendLog('stderr', `\nSecurity Error: Step working directory "${step.working_dir}" escapes project root.\n`);
          break;
        }
        stepWorkingDir = resolved;
      }

      const stepResult = await this.executeStep(deploymentId, step.command, stepWorkingDir, mergedEnv, appendLog, stepNum, step.name);

      if (stepResult.code !== 0) {
        if (step.continue_on_error !== 1) {
          overallSuccess = false;
          finalExitCode = stepResult.code;
          failedErrorMessage = `Process completed with exit code ${stepResult.code}.`;
          appendLog('stderr', `\nError: Process completed with exit code ${stepResult.code}.\n`);
          break;
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const runRef = this.activeRuns.get(deploymentId);

    if (runRef?.aborted) {
      this.finishDeployment(deploymentId, 'ABORTED', durationMs, accumulatedLogs, 130, 'Deployment was aborted.', options, project);
    } else if (overallSuccess) {
      this.finishDeployment(deploymentId, 'SUCCESS', durationMs, accumulatedLogs, 0, null, options, project);
    } else {
      this.finishDeployment(deploymentId, 'FAILED', durationMs, accumulatedLogs, finalExitCode, failedErrorMessage, options, project);
    }
  }

  private static executeStep(
    deploymentId: number,
    command: string,
    cwd: string,
    env: NodeJS.ProcessEnv,
    appendLog: (stream: 'stdout' | 'stderr' | 'system', text: string, stepIndex?: number, stepName?: string) => void,
    stepNum: number,
    stepName: string
  ): Promise<{ code: number }> {
    return new Promise((resolve) => {
      // Ensure working directory exists on host
      if (!fs.existsSync(cwd)) {
        try {
          fs.mkdirSync(cwd, { recursive: true });
        } catch {
          // ignore
        }
      }

      const child = spawn(command, [], {
        cwd,
        env,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const runRef = this.activeRuns.get(deploymentId);
      if (runRef) {
        runRef.process = child;
      }

      child.stdout.on('data', (data: Buffer) => {
        appendLog('stdout', data.toString('utf-8'), stepNum, stepName);
      });

      child.stderr.on('data', (data: Buffer) => {
        appendLog('stderr', data.toString('utf-8'), stepNum, stepName);
      });

      child.on('error', (err) => {
        appendLog('stderr', `Execution Error: ${err.message}\r\n`, stepNum, stepName);
        resolve({ code: 1 });
      });

      child.on('close', (code) => {
        resolve({ code: code ?? 0 });
      });
    });
  }

  private static finishDeployment(
    deploymentId: number,
    status: 'SUCCESS' | 'FAILED' | 'ABORTED',
    durationMs: number,
    logs: string,
    exitCode: number,
    errorMessage: string | null,
    options: { userId: number; username: string; userRole: string; ipAddress: string },
    project: ProjectRow
  ) {
    const finishedAt = new Date().toISOString();

    db.prepare(`
      UPDATE deployments
      SET status = ?, finished_at = ?, duration_ms = ?, exit_code = ?, logs = ?, error_message = ?
      WHERE id = ?
    `).run(
      status,
      finishedAt,
      durationMs,
      exitCode,
      logs,
      errorMessage,
      deploymentId
    );

    this.activeRuns.delete(deploymentId);

    WsManager.broadcastDeployStatus(deploymentId, status, {
      durationMs,
      exitCode,
      finishedAt,
    });

    // Audit log
    AuditService.log({
      userId: options.userId,
      username: options.username,
      userRole: options.userRole,
      ipAddress: options.ipAddress,
      action: status === 'SUCCESS' ? 'DEPLOY_SUCCESS' : status === 'ABORTED' ? 'DEPLOY_ABORTED' : 'DEPLOY_FAILED',
      target: `Project: "${project.name}" (#${project.id})`,
      details: `Deployment #${deploymentId} finished with status ${status} in ${(durationMs / 1000).toFixed(1)}s (exit code: ${exitCode}).`,
    });
  }

  public static abortDeployment(deploymentId: number, user: { id: number; username: string; role: string; ip: string }): boolean {
    const runRef = this.activeRuns.get(deploymentId);
    if (!runRef) return false;

    runRef.aborted = true;

    if (runRef.process && runRef.process.pid) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', runRef.process.pid.toString(), '/f', '/t']);
        } else {
          runRef.process.kill('SIGTERM');
        }
      } catch (err: any) {
        console.error('Failed to kill process:', err.message);
      }
    }

    AuditService.log({
      userId: user.id,
      username: user.username,
      userRole: user.role,
      ipAddress: user.ip,
      action: 'DEPLOY_ABORT_REQUESTED',
      target: `Deployment #${deploymentId}`,
      details: `User requested manual abort for running deployment #${deploymentId}.`,
    });

    return true;
  }

  public static getDeploymentsByProjectId(projectId: number, limit = 25) {
    return db.prepare(`
      SELECT id, project_id, project_name, triggered_by_user_id, triggered_by_username, status, started_at, finished_at, duration_ms, exit_code, error_message
      FROM deployments
      WHERE project_id = ?
      ORDER BY id DESC
      LIMIT ?
    `).all(projectId, limit);
  }

  public static getDeploymentById(deploymentId: number): DeploymentRow | null {
    return (db.prepare('SELECT * FROM deployments WHERE id = ?').get(deploymentId) as unknown as DeploymentRow) || null;
  }
}
