import React, { useState, useEffect } from 'react';
import {
  Cpu,
  HardDrive,
  Activity,
  RotateCw,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  Server,
  Zap,
  Boxes
} from 'lucide-react';
import { api, SystemStats, User } from '../api';

interface SystemResourceWidgetProps {
  currentUser: User;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const SystemResourceWidget: React.FC<SystemResourceWidgetProps> = ({ currentUser }) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [pruning, setPruning] = useState(false);
  const [pruneResult, setPruneResult] = useState<string | null>(null);
  const [showPruneModal, setShowPruneModal] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.getSystemStats();
      setStats(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handlePrune = async () => {
    try {
      setPruning(true);
      const res = await api.pruneDockerSystem();
      setPruneResult(res.output || res.message);
      fetchStats();
    } catch (err: any) {
      alert(`Prune failed: ${err.message}`);
    } finally {
      setPruning(false);
    }
  };

  if (!stats) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
      {/* RAM Pill */}
      <div
        className="px-2.5 py-1 rounded-xl bg-white border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center gap-2"
        title={`RAM: ${formatBytes(stats.memory.usedBytes)} of ${formatBytes(stats.memory.totalBytes)} (${stats.memory.usedPercent}%)`}
      >
        <Activity className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span className="font-bold text-zinc-600 hidden sm:inline">RAM:</span>
        <span className="font-black text-black">{stats.memory.usedPercent}%</span>
        <div className="w-12 h-1.5 bg-zinc-200 rounded-full overflow-hidden border border-black/20">
          <div
            className={`h-full ${
              stats.memory.usedPercent > 85
                ? 'bg-rose-500'
                : stats.memory.usedPercent > 70
                ? 'bg-amber-400'
                : 'bg-[#22C55E]'
            }`}
            style={{ width: `${Math.min(stats.memory.usedPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Disk Pill */}
      <div
        className="px-2.5 py-1 rounded-xl bg-white border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center gap-2"
        title={`Disk: ${formatBytes(stats.disk.freeBytes)} free of ${formatBytes(stats.disk.totalBytes)} (${stats.disk.usedPercent}% used)`}
      >
        <HardDrive className="w-3.5 h-3.5 text-purple-600 shrink-0" />
        <span className="font-bold text-zinc-600 hidden sm:inline">Disk:</span>
        <span className="font-black text-black">{formatBytes(stats.disk.freeBytes)} free</span>
      </div>

      {/* Uptime Pill */}
      <div
        className="px-2.5 py-1 rounded-xl bg-white border-2 border-black shadow-[1.5px_1.5px_0px_#000] hidden md:flex items-center gap-1.5 text-zinc-700"
        title="Server Uptime"
      >
        <Clock className="w-3.5 h-3.5 text-zinc-500" />
        <span className="font-bold">{formatUptime(stats.uptimeSeconds)}</span>
      </div>

      {/* Docker Clean Action (Main Admin Only) */}
      {currentUser.role === 'MAIN_ADMIN' && stats.docker.available && (
        <button
          type="button"
          onClick={() => setShowPruneModal(true)}
          className="px-2.5 py-1 rounded-xl bg-[#FEF08A] hover:bg-yellow-300 text-black border-2 border-black text-xs font-black shadow-[1.5px_1.5px_0px_#000] cursor-pointer flex items-center gap-1.5 transition-colors"
          title="Clean unused Docker images and reclaim disk space"
        >
          <Trash2 className="w-3 h-3 text-black" />
          <span className="hidden lg:inline">Prune Docker</span>
        </button>
      )}

      {/* Refresh stats button */}
      <button
        type="button"
        onClick={fetchStats}
        disabled={loading}
        className="p-1 rounded-lg hover:bg-black/5 text-zinc-600 hover:text-black transition-colors"
        title="Refresh system metrics"
      >
        <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>

      {/* Docker Prune Confirmation Modal */}
      {showPruneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="neo-box w-full max-w-lg bg-[#FFFDF5] p-6 space-y-5">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FACC15] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
                  <Boxes className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-black text-base text-black">Clean Unused Docker Resources</h3>
                  <p className="text-[11px] text-zinc-600 font-bold">Reclaim VPS disk space immediately</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPruneModal(false);
                  setPruneResult(null);
                }}
                className="w-7 h-7 rounded-lg bg-white border border-black flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-zinc-700 font-medium leading-relaxed">
                This will execute <code className="bg-zinc-200 px-1.5 py-0.5 rounded font-mono font-bold">docker system prune -f</code> on your host VPS.
                It safely removes:
              </p>
              <ul className="list-disc list-inside space-y-1 text-zinc-600 font-mono text-[11px]">
                <li>All stopped containers</li>
                <li>All unused networks</li>
                <li>Dangling and unused build cache</li>
                <li>Dangling images</li>
              </ul>
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-[11px] font-bold">
                ⚠️ Running containers and their active volumes will NOT be affected.
              </div>

              {pruneResult && (
                <div className="p-3 bg-zinc-900 border border-black rounded-xl text-emerald-400 font-mono text-[11px] max-h-36 overflow-auto whitespace-pre-wrap">
                  {pruneResult}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-black">
              <button
                type="button"
                onClick={() => {
                  setShowPruneModal(false);
                  setPruneResult(null);
                }}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-black font-extrabold text-xs border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrune}
                disabled={pruning}
                className="px-5 py-2 rounded-xl bg-[#EF4444] hover:bg-red-600 text-white font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer flex items-center gap-1.5"
              >
                {pruning ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cleaning Disk...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Run Prune Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
