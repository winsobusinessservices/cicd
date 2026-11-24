import { db } from '../db/index.js';
import { ProjectRow } from './project.service.js';
import { RunnerService } from './runner.service.js';
import { AuditService } from './audit.service.js';

export class ScheduleService {
  private static timer: NodeJS.Timeout | null = null;
  private static lastTriggeredKey: Map<number, string> = new Map();

  public static init(): void {
    if (this.timer) return;

    // Check every 30 seconds
    this.timer = setInterval(() => {
      this.tick();
    }, 30000);

    console.log('[ScheduleService] Initialized scheduled deployment engine.');
  }

  private static tick(): void {
    const now = new Date();
    // Unique key for current minute: YYYY-MM-DD-HH-mm
    const minuteKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;

    try {
      const projects = db.prepare(`
        SELECT * FROM projects WHERE schedule_enabled = 1 AND schedule_cron IS NOT NULL AND schedule_cron != ''
      `).all() as unknown as ProjectRow[];

      for (const p of projects) {
        if (!p.schedule_cron) continue;

        // Skip if already triggered in this minute
        if (this.lastTriggeredKey.get(p.id) === minuteKey) continue;

        if (this.matchesCron(p.schedule_cron, now)) {
          this.lastTriggeredKey.set(p.id, minuteKey);
          console.log(`[ScheduleService] Triggering scheduled deployment for project "${p.name}" (cron: ${p.schedule_cron})`);

          AuditService.log({
            userId: null,
            username: 'Scheduler (Cron)',
            userRole: 'SYSTEM',
            ipAddress: '127.0.0.1',
            action: 'SCHEDULED_DEPLOY_TRIGGERED',
            target: `Project: "${p.name}" (#${p.id})`,
            details: `Triggered deployment according to cron schedule: "${p.schedule_cron}".`,
          });

          RunnerService.startDeployment({
            projectId: p.id,
            userId: 0,
            username: 'Scheduler (Cron)',
            userRole: 'MAIN_ADMIN',
            ipAddress: '127.0.0.1',
            triggerType: 'SCHEDULE',
            commitMessage: `Scheduled automated deployment (${p.schedule_cron})`,
          }).catch((err) => {
            console.error(`[ScheduleService] Failed to trigger deployment for project #${p.id}:`, err.message);
          });
        }
      }
    } catch (err: any) {
      console.error('[ScheduleService] Error during tick:', err.message);
    }
  }

  public static matchesCron(cron: string, date: Date): boolean {
    let expr = cron.trim();
    if (expr === '@hourly') expr = '0 * * * *';
    if (expr === '@daily' || expr === '@midnight') expr = '0 0 * * *';
    if (expr === '@weekly') expr = '0 0 * * 0';
    if (expr === '@monthly') expr = '0 0 1 * *';

    const parts = expr.split(/\s+/).filter(Boolean);
    if (parts.length !== 5) return false;

    const [minRule, hourRule, domRule, monthRule, dowRule] = parts;
    const curMin = date.getMinutes();
    const curHour = date.getHours();
    const curDom = date.getDate();
    const curMonth = date.getMonth() + 1; // 1-12
    const curDow = date.getDay(); // 0-6 (0 = Sunday)

    const matchField = (field: string, val: number): boolean => {
      if (field === '*') return true;
      if (field.includes(',')) {
        return field.split(',').some((sub) => matchField(sub.trim(), val));
      }
      if (field.startsWith('*/')) {
        const step = parseInt(field.slice(2), 10);
        return !isNaN(step) && step > 0 && val % step === 0;
      }
      if (field.includes('-')) {
        const [start, end] = field.split('-').map((s) => parseInt(s.trim(), 10));
        return val >= start && val <= end;
      }
      return parseInt(field, 10) === val;
    };

    return (
      matchField(minRule, curMin) &&
      matchField(hourRule, curHour) &&
      matchField(domRule, curDom) &&
      matchField(monthRule, curMonth) &&
      matchField(dowRule, curDow)
    );
  }
}
