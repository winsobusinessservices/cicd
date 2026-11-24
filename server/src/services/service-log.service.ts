import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index.js';
import { WsManager } from '../websocket.js';
import { ProjectService, ProjectRow } from './project.service.js';

export interface ProjectServiceRow {
  id: number;
  project_id: number;
  name: string;
  log_command: string;
  working_dir: string;
  color: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceInput {
  id?: number;
  name: string;
  log_command: string;
  working_dir?: string;
  color?: string;
  display_order?: number;
}

interface ActiveStream {
  process: ChildProcess;
  buffer: string[];
  status: 'STREAMING' | 'STOPPED' | 'ERROR';
  startedAt: string;
  command: string;
}

export class ServiceLogService {
  private static activeStreams: Map<number, ActiveStream> = new Map();
  private static maxBufferLines = 1500;

  /**
   * Get all configured services for a project
   */
  public static getServicesByProjectId(projectId: number): ProjectServiceRow[] {
    return db.prepare(`
      SELECT * FROM project_services WHERE project_id = ? ORDER BY display_order ASC, id ASC
    `).all(projectId) as unknown as ProjectServiceRow[];
  }

  /**
   * Get single service definition by ID
   */
  public static getServiceById(serviceId: number): ProjectServiceRow | undefined {
    return db.prepare(`
      SELECT * FROM project_services WHERE id = ?
    `).get(serviceId) as unknown as ProjectServiceRow | undefined;
  }

  /**
   * Atomically replace/save services for a project
   */
  public static saveServices(projectId: number, services: ServiceInput[]): ProjectServiceRow[] {
    const now = new Date().toISOString();

    db.exec('BEGIN TRANSACTION;');
    try {
      // Find IDs of deleted services to stop their streams
      const existing = this.getServicesByProjectId(projectId);
      const newIds = new Set(services.filter((s) => s.id).map((s) => s.id));
      for (const ex of existing) {
        if (!newIds.has(ex.id)) {
          this.stopStream(ex.id);
        }
      }

      db.prepare('DELETE FROM project_services WHERE project_id = ?').run(projectId);

      const insertStmt = db.prepare(`
        INSERT INTO project_services (project_id, name, log_command, working_dir, color, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      services.forEach((s, idx) => {
        const order = s.display_order ?? idx + 1;
        const color = s.color || 'blue';
        insertStmt.run(
          projectId,
          s.name.trim(),
          s.log_command.trim(),
          (s.working_dir || '').trim(),
          color,
          order,
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

    return this.getServicesByProjectId(projectId);
  }

  /**
   * Delete a single service
   */
  public static deleteService(serviceId: number): boolean {
    this.stopStream(serviceId);
    const res = db.prepare('DELETE FROM project_services WHERE id = ?').run(serviceId);
    return res.changes > 0;
  }

  /**
   * Get current state & recent buffer for a service stream
   */
  public static getStreamState(serviceId: number): {
    status: 'STREAMING' | 'STOPPED' | 'ERROR';
    logs: string;
    command: string;
    startedAt: string | null;
  } {
    const active = this.activeStreams.get(serviceId);
    const service = this.getServiceById(serviceId);
    if (!service) {
      throw new Error(`Service #${serviceId} not found.`);
    }

    if (active) {
      return {
        status: active.status,
        logs: active.buffer.join(''),
        command: active.command,
        startedAt: active.startedAt,
      };
    }

    return {
      status: 'STOPPED',
      logs: '',
      command: service.log_command,
      startedAt: null,
    };
  }

  /**
   * Start live streaming logs for a service
   */
  public static startStream(serviceId: number): {
    status: 'STREAMING' | 'STOPPED' | 'ERROR';
    logs: string;
    command: string;
  } {
    const service = this.getServiceById(serviceId);
    if (!service) {
      throw new Error(`Service #${serviceId} not found.`);
    }

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(service.project_id) as unknown as ProjectRow | undefined;
    if (!project) {
      throw new Error(`Parent project #${service.project_id} not found.`);
    }

    // If stream is already active and process is alive, return current state
    const existing = this.activeStreams.get(serviceId);
    if (existing && existing.status === 'STREAMING' && !existing.process.killed) {
      return {
        status: existing.status,
        logs: existing.buffer.join(''),
        command: existing.command,
      };
    }

    // Stop any stale process
    if (existing) {
      this.stopStream(serviceId);
    }

    // Determine working directory
    let effectiveDir = project.project_path;
    if (service.working_dir) {
      effectiveDir = path.isAbsolute(service.working_dir)
        ? service.working_dir
        : path.resolve(project.project_path, service.working_dir);
    }

    try {
      if (!fs.existsSync(effectiveDir)) {
        fs.mkdirSync(effectiveDir, { recursive: true });
      }
    } catch {
      // ignore
    }

    // Merge environment variables from project .env
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
        envVars = { ...envVars, ...diskVars };
      } catch {
        // ignore
      }
    }

    const command = service.log_command;
    const buffer: string[] = [];

    const appendChunk = (stream: 'stdout' | 'stderr' | 'system', text: string) => {
      buffer.push(text);
      // Keep buffer within line limits
      if (buffer.length > this.maxBufferLines) {
        buffer.splice(0, buffer.length - this.maxBufferLines);
      }
      WsManager.broadcastToChannel(`service_log:${serviceId}`, {
        type: 'LOG_CHUNK',
        serviceId,
        stream,
        text,
        timestamp: new Date().toISOString(),
      });
    };

    appendChunk('system', `[Varex] Starting live log stream for service "${service.name}"...\n$ ${command}\n\n`);

    const child = spawn(command, [], {
      cwd: effectiveDir,
      env: { ...process.env, ...envVars },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const streamEntry: ActiveStream = {
      process: child,
      buffer,
      status: 'STREAMING',
      startedAt: new Date().toISOString(),
      command,
    };
    this.activeStreams.set(serviceId, streamEntry);

    WsManager.broadcastToChannel(`service_log:${serviceId}`, {
      type: 'STREAM_STATUS',
      serviceId,
      status: 'STREAMING',
      command,
      timestamp: new Date().toISOString(),
    });

    child.stdout?.on('data', (data) => {
      appendChunk('stdout', data.toString());
    });

    child.stderr?.on('data', (data) => {
      appendChunk('stderr', data.toString());
    });

    child.on('close', (code) => {
      const current = this.activeStreams.get(serviceId);
      if (current && current.status === 'STREAMING') {
        current.status = 'STOPPED';
        appendChunk('system', `\n[Varex] Log process exited with code ${code}.\n`);
        WsManager.broadcastToChannel(`service_log:${serviceId}`, {
          type: 'STREAM_STATUS',
          serviceId,
          status: 'STOPPED',
          exitCode: code,
          timestamp: new Date().toISOString(),
        });
      }
    });

    child.on('error', (err) => {
      const current = this.activeStreams.get(serviceId);
      if (current) {
        current.status = 'ERROR';
        appendChunk('stderr', `\n[Varex Error] Failed to start log process: ${err.message}\n`);
        WsManager.broadcastToChannel(`service_log:${serviceId}`, {
          type: 'STREAM_STATUS',
          serviceId,
          status: 'ERROR',
          errorMessage: err.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    return {
      status: 'STREAMING',
      logs: buffer.join(''),
      command,
    };
  }

  /**
   * Stop live streaming for a service
   */
  public static stopStream(serviceId: number): boolean {
    const active = this.activeStreams.get(serviceId);
    if (!active) return false;

    active.status = 'STOPPED';
    if (active.process && active.process.pid && !active.process.killed) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', active.process.pid.toString(), '/f', '/t']);
        } else {
          active.process.kill('SIGTERM');
        }
      } catch (err: any) {
        console.error(`Failed to kill service log process #${serviceId}:`, err.message);
      }
    }

    active.buffer.push(`\n[Varex] Live log streaming stopped by user.\n`);
    WsManager.broadcastToChannel(`service_log:${serviceId}`, {
      type: 'LOG_CHUNK',
      serviceId,
      stream: 'system',
      text: `\n[Varex] Live log streaming stopped by user.\n`,
      timestamp: new Date().toISOString(),
    });

    WsManager.broadcastToChannel(`service_log:${serviceId}`, {
      type: 'STREAM_STATUS',
      serviceId,
      status: 'STOPPED',
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Clear in-memory log buffer
   */
  public static clearBuffer(serviceId: number): void {
    const active = this.activeStreams.get(serviceId);
    if (active) {
      active.buffer = [];
    }
  }
}
