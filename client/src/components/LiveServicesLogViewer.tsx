import React, { useState, useEffect, useRef, useMemo } from 'react';
import Ansi from 'ansi-to-html';
import {
  Play,
  Square,
  RotateCw,
  Trash2,
  Copy,
  Check,
  Download,
  Search,
  Maximize2,
  Minimize2,
  Plus,
  Settings,
  Terminal,
  Cpu,
  Layers,
  Boxes,
  Radio,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowUp,
  ArrowDown,
  Sparkles,
  HelpCircle,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { api, ProjectServiceItem, User } from '../api';
import { HeroTerminalServer, DoodleSparks, GearLaptopIllustration } from './Illustrations';

const ansiConverter = new Ansi({
  fg: '#F1F5F9',
  bg: '#0C0D12',
  newline: false,
  escapeXML: true,
  stream: true,
});

const SERVICE_COLORS = [
  { name: 'Blue', id: 'blue', bg: 'bg-[#BAE6FD]', border: 'border-[#0284C7]', text: 'text-[#0369A1]', dot: 'bg-[#0284C7]' },
  { name: 'Emerald', id: 'emerald', bg: 'bg-[#BBF7D0]', border: 'border-[#16A34A]', text: 'text-[#15803D]', dot: 'bg-[#16A34A]' },
  { name: 'Purple', id: 'purple', bg: 'bg-[#DDD6FE]', border: 'border-[#7C3AED]', text: 'text-[#6D28D9]', dot: 'bg-[#7C3AED]' },
  { name: 'Amber', id: 'amber', bg: 'bg-[#FEF08A]', border: 'border-[#CA8A04]', text: 'text-[#A16207]', dot: 'bg-[#CA8A04]' },
  { name: 'Rose', id: 'rose', bg: 'bg-[#FECDD3]', border: 'border-[#E11D48]', text: 'text-[#BE123C]', dot: 'bg-[#E11D48]' },
  { name: 'Cyan', id: 'cyan', bg: 'bg-[#A5F3FC]', border: 'border-[#0891B2]', text: 'text-[#0E7490]', dot: 'bg-[#0891B2]' },
];

function getColorConfig(colorId?: string) {
  return SERVICE_COLORS.find((c) => c.id === colorId) || SERVICE_COLORS[0];
}

interface LiveServicesLogViewerProps {
  projectId: number;
  projectName: string;
  projectPath: string;
  currentUser: User;
  ws: WebSocket | null;
  onServicesCountChange?: (count: number) => void;
}

export const LiveServicesLogViewer: React.FC<LiveServicesLogViewerProps> = ({
  projectId,
  projectName,
  projectPath,
  currentUser,
  ws,
  onServicesCountChange,
}) => {
  // Services list from server
  const [services, setServices] = useState<ProjectServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [activeServiceId, setActiveServiceId] = useState<number | null>(null);

  // Layout mode: single terminal vs multi-terminal grid
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');

  // Service configuration modal / editor state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingServices, setEditingServices] = useState<ProjectServiceItem[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [numServicesInput, setNumServicesInput] = useState<number>(2);

  // Per-service log buffers and streaming state
  const [logsMap, setLogsMap] = useState<Record<number, string>>({});
  const [statusMap, setStatusMap] = useState<Record<number, 'STREAMING' | 'STOPPED' | 'ERROR'>>({});

  // Search, fullscreen, auto-scroll states per terminal
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const [showSearchMap, setShowSearchMap] = useState<Record<number, boolean>>({});
  const [copiedMap, setCopiedMap] = useState<Record<number, boolean>>({});
  const [fullscreenServiceId, setFullscreenServiceId] = useState<number | null>(null);
  const [autoScrollMap, setAutoScrollMap] = useState<Record<number, boolean>>({});

  // Container Quick Actions & Exec state
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<number, 'restart' | 'stop' | 'start' | null>>({});
  const [actionFeedbackMap, setActionFeedbackMap] = useState<Record<number, { text: string; success: boolean } | null>>({});
  const [execModalService, setExecModalService] = useState<ProjectServiceItem | null>(null);
  const [execCommand, setExecCommand] = useState<string>('ls -la');
  const [execInContainer, setExecInContainer] = useState<boolean>(true);
  const [execRunning, setExecRunning] = useState<boolean>(false);
  const [execOutput, setExecOutput] = useState<{ stdout: string; stderr: string; exitCode: number } | null>(null);

  const terminalEndRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // 1. Fetch services list on mount or project change
  const loadServices = async () => {
    try {
      setLoadingServices(true);
      const list = await api.getProjectServices(projectId);
      setServices(list);
      if (onServicesCountChange) {
        onServicesCountChange(list.length);
      }
      if (list.length > 0) {
        if (!activeServiceId || !list.some((s) => s.id === activeServiceId)) {
          setActiveServiceId(list[0].id || null);
        }
        // Initialize status map
        const initialStatus: Record<number, 'STREAMING' | 'STOPPED' | 'ERROR'> = {};
        list.forEach((s) => {
          if (s.id) {
            initialStatus[s.id] = s.status || 'STOPPED';
          }
        });
        setStatusMap((prev) => ({ ...prev, ...initialStatus }));
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [projectId]);

  // 2. Fetch initial logs when an active service is selected or changed
  useEffect(() => {
    if (!activeServiceId) return;
    // If not already fetched, load current state & buffer
    if (logsMap[activeServiceId] === undefined) {
      api
        .getServiceLogs(projectId, activeServiceId)
        .then((state) => {
          setLogsMap((prev) => ({ ...prev, [activeServiceId]: state.logs || '' }));
          setStatusMap((prev) => ({ ...prev, [activeServiceId]: state.status }));
        })
        .catch(() => {});
    }

    // Subscribe to this service's channel over WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'subscribe', channel: `service_log:${activeServiceId}` }));
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'unsubscribe', channel: `service_log:${activeServiceId}` }));
      }
    };
  }, [activeServiceId, ws]);

  // Subscribe to all services when in grid mode
  useEffect(() => {
    if (viewMode === 'grid' && ws && ws.readyState === WebSocket.OPEN) {
      services.forEach((s) => {
        if (s.id) {
          ws.send(JSON.stringify({ action: 'subscribe', channel: `service_log:${s.id}` }));
          if (logsMap[s.id] === undefined) {
            api
              .getServiceLogs(projectId, s.id)
              .then((state) => {
                setLogsMap((prev) => ({ ...prev, [s.id!]: state.logs || '' }));
                setStatusMap((prev) => ({ ...prev, [s.id!]: state.status }));
              })
              .catch(() => {});
          }
        }
      });

      return () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          services.forEach((s) => {
            if (s.id) {
              ws.send(JSON.stringify({ action: 'unsubscribe', channel: `service_log:${s.id}` }));
            }
          });
        }
      };
    }
  }, [viewMode, services, ws]);

  // 3. Listen to WebSocket messages for live chunks
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg.channel?.startsWith('service_log:')) return;

        const serviceId = msg.serviceId;
        if (!serviceId) return;

        if (msg.type === 'LOG_CHUNK') {
          setLogsMap((prev) => {
            const current = prev[serviceId] || '';
            return { ...prev, [serviceId]: current + msg.text };
          });
        }

        if (msg.type === 'STREAM_STATUS') {
          setStatusMap((prev) => ({
            ...prev,
            [serviceId]: msg.status,
          }));
        }
      } catch {
        // ignore
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws]);

  // 4. Auto-scroll terminal when new logs arrive
  useEffect(() => {
    Object.keys(logsMap).forEach((idStr) => {
      const sId = Number(idStr);
      const isAutoScroll = autoScrollMap[sId] !== false; // default true
      if (isAutoScroll && terminalEndRefs.current[sId]) {
        terminalEndRefs.current[sId]?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, [logsMap, autoScrollMap]);

  // 5. Controls: Start, Stop, Clear
  const handleStartStream = async (serviceId: number) => {
    try {
      setStatusMap((prev) => ({ ...prev, [serviceId]: 'STREAMING' }));
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'subscribe', channel: `service_log:${serviceId}` }));
      }
      const res = await api.startServiceLog(projectId, serviceId);
      setLogsMap((prev) => ({ ...prev, [serviceId]: res.logs || '' }));
      setStatusMap((prev) => ({ ...prev, [serviceId]: res.status }));
    } catch (err: any) {
      alert(`Failed to start log stream: ${err.message}`);
      setStatusMap((prev) => ({ ...prev, [serviceId]: 'ERROR' }));
    }
  };

  const handleStopStream = async (serviceId: number) => {
    try {
      await api.stopServiceLog(projectId, serviceId);
      setStatusMap((prev) => ({ ...prev, [serviceId]: 'STOPPED' }));
    } catch (err: any) {
      console.error('Failed to stop log stream:', err);
    }
  };

  const handleClearTerminal = async (serviceId: number) => {
    try {
      await api.clearServiceLogs(projectId, serviceId);
      setLogsMap((prev) => ({ ...prev, [serviceId]: '' }));
    } catch (err: any) {
      console.error('Failed to clear logs:', err);
    }
  };

  const handleCopyLogs = (serviceId: number) => {
    const text = logsMap[serviceId] || '';
    navigator.clipboard.writeText(text);
    setCopiedMap((prev) => ({ ...prev, [serviceId]: true }));
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, [serviceId]: false }));
    }, 2000);
  };

  const handleDownloadLogs = (serviceId: number, serviceName: string) => {
    const text = logsMap[serviceId] || '';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.toLowerCase()}-${serviceName.toLowerCase()}-live.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Start / Stop all
  const handleStartAll = () => {
    services.forEach((s) => {
      if (s.id) handleStartStream(s.id);
    });
  };

  const handleStopAll = () => {
    services.forEach((s) => {
      if (s.id) handleStopStream(s.id);
    });
  };

  // 6. Service Configuration Helpers
  const openConfigModal = () => {
    setEditingServices(
      services.length > 0
        ? JSON.parse(JSON.stringify(services))
        : [
            {
              name: 'Frontend',
              log_command: 'docker compose logs -f --tail=100 frontend',
              working_dir: '',
              color: 'blue',
              display_order: 1,
            },
            {
              name: 'Backend',
              log_command: 'docker compose logs -f --tail=100 backend',
              working_dir: '',
              color: 'emerald',
              display_order: 2,
            },
          ]
    );
    setNumServicesInput(services.length > 0 ? services.length : 2);
    setShowConfigModal(true);
  };

  const handleGenerateServicesByCount = (count: number) => {
    const newItems: ProjectServiceItem[] = [];
    const colorKeys = SERVICE_COLORS.map((c) => c.id);
    for (let i = 1; i <= count; i++) {
      let defaultName = `Service ${i}`;
      let defaultCmd = `docker compose logs -f --tail=100 service-${i}`;
      if (count === 2) {
        if (i === 1) {
          defaultName = 'Frontend';
          defaultCmd = 'docker compose logs -f --tail=100 frontend';
        } else {
          defaultName = 'Backend';
          defaultCmd = 'docker compose logs -f --tail=100 backend';
        }
      } else if (count === 3) {
        if (i === 1) {
          defaultName = 'Frontend';
          defaultCmd = 'docker compose logs -f --tail=100 frontend';
        } else if (i === 2) {
          defaultName = 'Backend API';
          defaultCmd = 'docker compose logs -f --tail=100 api';
        } else {
          defaultName = 'Database';
          defaultCmd = 'docker compose logs -f --tail=100 db';
        }
      }
      newItems.push({
        name: defaultName,
        log_command: defaultCmd,
        working_dir: '',
        color: colorKeys[(i - 1) % colorKeys.length],
        display_order: i,
      });
    }
    setEditingServices(newItems);
  };

  const handleSaveServices = async () => {
    for (let i = 0; i < editingServices.length; i++) {
      const s = editingServices[i];
      if (!s.name.trim()) {
        alert(`Service #${i + 1} is missing a name.`);
        return;
      }
      if (!s.log_command.trim()) {
        alert(`Service "${s.name}" is missing a log command.`);
        return;
      }
    }

    try {
      setSavingConfig(true);
      const res = await api.saveProjectServices(projectId, editingServices);
      setServices(res.services);
      if (onServicesCountChange) {
        onServicesCountChange(res.services.length);
      }
      if (res.services.length > 0) {
        setActiveServiceId(res.services[0].id || null);
      }
      setShowConfigModal(false);
    } catch (err: any) {
      alert(`Failed to save services: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // Container quick actions (restart, stop, start)
  const handleContainerAction = async (serviceId: number, action: 'restart' | 'stop' | 'start') => {
    try {
      setActionLoadingMap((prev) => ({ ...prev, [serviceId]: action }));
      setActionFeedbackMap((prev) => ({ ...prev, [serviceId]: null }));
      const res = await api.executeContainerAction(projectId, serviceId, action);
      setActionFeedbackMap((prev) => ({
        ...prev,
        [serviceId]: { text: `${action.toUpperCase()} OK`, success: res.success },
      }));
      setTimeout(() => {
        setActionFeedbackMap((prev) => ({ ...prev, [serviceId]: null }));
      }, 3500);
    } catch (err: any) {
      setActionFeedbackMap((prev) => ({
        ...prev,
        [serviceId]: { text: `${action.toUpperCase()} ERR: ${err.message}`, success: false },
      }));
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [serviceId]: null }));
    }
  };

  // Run one-off container or host command
  const handleRunExec = async () => {
    if (!execModalService?.id || !execCommand.trim()) return;
    try {
      setExecRunning(true);
      setExecOutput(null);
      const res = await api.executeContainerCommand(
        projectId,
        execModalService.id,
        execCommand.trim(),
        execInContainer
      );
      setExecOutput({
        stdout: res.stdout,
        stderr: res.stderr,
        exitCode: res.exitCode,
      });
    } catch (err: any) {
      setExecOutput({
        stdout: '',
        stderr: err.message,
        exitCode: 1,
      });
    } finally {
      setExecRunning(false);
    }
  };

  // Filter terminal lines
  const getRenderLines = (serviceId: number) => {
    const raw = logsMap[serviceId] || '';
    const term = searchTerms[serviceId]?.toLowerCase() || '';
    const lines = raw.split('\n');
    if (!term) return lines;
    return lines.filter((l) => l.toLowerCase().includes(term));
  };

  // Render individual terminal
  const renderTerminal = (service: ProjectServiceItem, isFullscreen: boolean) => {
    const sId = service.id!;
    const status = statusMap[sId] || 'STOPPED';
    const lines = getRenderLines(sId);
    const color = getColorConfig(service.color);
    const showSearch = showSearchMap[sId] || false;
    const isAutoScroll = autoScrollMap[sId] !== false;

    return (
      <div
        key={sId}
        className={`flex flex-col rounded-2xl border-2 border-black overflow-hidden shadow-[4px_4px_0px_#000000] bg-[#0C0D12] transition-all ${
          isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'h-full min-h-[460px]'
        }`}
      >
        {/* Terminal Header */}
        <div className="bg-[#181920] border-b-2 border-black px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Left: Window Dots & Service Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-3 h-3 rounded-full bg-[#EF4444] border border-black/40" />
              <div className="w-3 h-3 rounded-full bg-[#FACC15] border border-black/40" />
              <div className="w-3 h-3 rounded-full bg-[#22C55E] border border-black/40" />
            </div>

            <div className="flex items-center gap-2 pl-1 truncate">
              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider border border-black ${color.bg} ${color.text}`}
              >
                {service.name}
              </span>

              {/* Status Indicator */}
              {status === 'STREAMING' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-[11px] font-mono font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  LIVE
                </span>
              ) : status === 'ERROR' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-400 text-[11px] font-mono font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  ERROR
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-[11px] font-mono">
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  IDLE
                </span>
              )}
            </div>
          </div>

          {/* Center / Command preview */}
          <div className="hidden xl:flex items-center gap-1.5 text-xs font-mono text-zinc-400 bg-black/40 px-3 py-1 rounded-lg border border-white/5 truncate max-w-[340px]">
            <span className="text-zinc-600">$</span>
            <span className="truncate text-zinc-300">{service.log_command}</span>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Start / Stop Toggle */}
            {status === 'STREAMING' ? (
              <button
                type="button"
                onClick={() => handleStopStream(sId)}
                className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white border border-black text-xs font-bold font-mono inline-flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_#000] cursor-pointer"
                title="Stop streaming logs"
              >
                <Square className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStartStream(sId)}
                className="px-2.5 py-1 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-black border border-black text-xs font-extrabold font-mono inline-flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_#000] cursor-pointer"
                title="Start streaming logs"
              >
                <Play className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">Stream</span>
              </button>
            )}

            {/* Clear logs */}
            <button
              type="button"
              onClick={() => handleClearTerminal(sId)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              title="Clear terminal buffer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Search */}
            {showSearch ? (
              <div className="flex items-center gap-1 bg-[#0C0D12] border border-zinc-700 rounded-lg px-2 py-0.5 text-xs">
                <Search className="w-3 h-3 text-zinc-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchTerms[sId] || ''}
                  onChange={(e) => setSearchTerms((prev) => ({ ...prev, [sId]: e.target.value }))}
                  placeholder="Filter logs..."
                  className="bg-transparent text-white font-mono text-xs focus:outline-none w-24 sm:w-32 placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchMap((prev) => ({ ...prev, [sId]: false }));
                    setSearchTerms((prev) => ({ ...prev, [sId]: '' }));
                  }}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSearchMap((prev) => ({ ...prev, [sId]: true }))}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                title="Search output"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Auto scroll toggle */}
            <button
              type="button"
              onClick={() => setAutoScrollMap((prev) => ({ ...prev, [sId]: !isAutoScroll }))}
              className={`p-1.5 rounded-lg transition-colors text-xs font-mono ${
                isAutoScroll ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={isAutoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is OFF'}
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={() => handleDownloadLogs(sId, service.name)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              title="Download log file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Copy */}
            <button
              type="button"
              onClick={() => handleCopyLogs(sId)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              title="Copy output"
            >
              {copiedMap[sId] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={() => setFullscreenServiceId(isFullscreen ? null : sId)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Container Action Controls & Quick Exec Bar */}
        <div className="bg-[#12131A] px-4 py-1.5 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold mr-1">Container:</span>

            {/* Restart */}
            <button
              type="button"
              disabled={Boolean(actionLoadingMap[sId])}
              onClick={() => handleContainerAction(sId, 'restart')}
              className="px-2.5 py-1 rounded-md bg-[#262738] hover:bg-[#34354A] text-zinc-200 border border-zinc-700 hover:border-zinc-500 text-[11px] font-bold font-mono inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Restart Docker container (docker restart)"
            >
              <RotateCw className={`w-3 h-3 ${actionLoadingMap[sId] === 'restart' ? 'animate-spin text-amber-400' : ''}`} />
              <span>Restart</span>
            </button>

            {/* Stop */}
            <button
              type="button"
              disabled={Boolean(actionLoadingMap[sId])}
              onClick={() => handleContainerAction(sId, 'stop')}
              className="px-2.5 py-1 rounded-md bg-[#262738] hover:bg-[#34354A] text-zinc-200 border border-zinc-700 hover:border-zinc-500 text-[11px] font-bold font-mono inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Stop Docker container (docker stop)"
            >
              <Square className={`w-3 h-3 ${actionLoadingMap[sId] === 'stop' ? 'text-rose-400' : ''}`} />
              <span>Stop</span>
            </button>

            {/* Start */}
            <button
              type="button"
              disabled={Boolean(actionLoadingMap[sId])}
              onClick={() => handleContainerAction(sId, 'start')}
              className="px-2.5 py-1 rounded-md bg-[#262738] hover:bg-[#34354A] text-zinc-200 border border-zinc-700 hover:border-zinc-500 text-[11px] font-bold font-mono inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Start Docker container (docker start)"
            >
              <Play className={`w-3 h-3 ${actionLoadingMap[sId] === 'start' ? 'text-emerald-400' : ''}`} />
              <span>Start</span>
            </button>

            {/* Exec Command */}
            <button
              type="button"
              onClick={() => {
                setExecModalService(service);
                setExecCommand('ls -la');
                setExecOutput(null);
                setExecInContainer(Boolean(service.container_name));
              }}
              className="px-2.5 py-1 rounded-md bg-[#FACC15] hover:bg-yellow-400 text-black border border-black text-[11px] font-extrabold font-mono inline-flex items-center gap-1 cursor-pointer transition-colors shadow-[1px_1px_0px_#000]"
              title="Execute command in container or host directory"
            >
              <Terminal className="w-3 h-3" />
              <span>Exec</span>
            </button>
          </div>

          {/* Feedback status pill if any */}
          {actionFeedbackMap[sId] && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold animate-fade-in ${
                actionFeedbackMap[sId]?.success
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-600/50'
                  : 'bg-rose-950/80 text-rose-400 border border-rose-600/50'
              }`}
            >
              {actionFeedbackMap[sId]?.text}
            </span>
          )}
        </div>

        {/* Command info bar on mobile / small screens */}
        <div className="xl:hidden bg-[#12131A] px-4 py-1.5 border-b border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-zinc-600">$</span>
            <span className="truncate">{service.log_command}</span>
          </div>
        </div>

        {/* Terminal Content Area */}
        <div className="flex-1 p-4 font-mono text-xs overflow-auto bg-[#0C0D12] text-zinc-200 select-text max-h-[500px]">
          {lines.length === 0 || (lines.length === 1 && lines[0] === '') ? (
            <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
              <Terminal className="w-8 h-8 text-zinc-700" />
              <p className="font-mono text-xs text-zinc-400">
                {status === 'STREAMING' ? 'Waiting for container output...' : 'Log stream is idle.'}
              </p>
              {status !== 'STREAMING' && (
                <button
                  type="button"
                  onClick={() => handleStartStream(sId)}
                  className="px-3 py-1.5 rounded-lg bg-[#FACC15] text-black font-extrabold text-xs border border-black shadow-[2px_2px_0px_#000] cursor-pointer hover:bg-yellow-400"
                >
                  ▶ Start Streaming Logs
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-start gap-4 hover:bg-white/[0.03]">
                  <span className="w-8 text-right text-zinc-600 select-none text-[11px] shrink-0 font-mono">
                    {idx + 1}
                  </span>
                  <span
                    className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-all"
                    dangerouslySetInnerHTML={{ __html: ansiConverter.toHtml(line) }}
                  />
                </div>
              ))}
              <div ref={(el) => { terminalEndRefs.current[sId] = el; }} />
            </div>
          )}
        </div>
      </div>
    );
  };

  // If loading
  if (loadingServices) {
    return (
      <div className="neo-box p-8 bg-white flex flex-col items-center justify-center space-y-3">
        <RotateCw className="w-6 h-6 animate-spin text-black" />
        <span className="font-mono text-xs font-bold text-zinc-600">Loading container services...</span>
      </div>
    );
  }

  // If no services configured yet: Empty State / Setup Wizard
  if (services.length === 0 && !showConfigModal) {
    return (
      <div className="space-y-6">
        <div className="neo-box p-6 sm:p-8 bg-white space-y-6 relative overflow-hidden">
          <DoodleSparks className="absolute top-4 right-4 pointer-events-none opacity-40" />

          <div className="flex flex-col md:flex-row items-center gap-6 justify-between border-b-2 border-black pb-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#BAE6FD] border border-black text-xs font-black uppercase text-[#0369A1]">
                <Boxes className="w-3.5 h-3.5" />
                <span>Multi-Container Live Logs</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-black">
                Separate Terminals for Docker Compose Services
              </h2>
              <p className="text-sm font-bold text-zinc-600 max-w-xl">
                Docker Compose stacks run multiple services simultaneously (e.g. Frontend, Backend API,
                Database, Worker). Define your project services to stream real-time logs in separate terminals side-by-side.
              </p>
            </div>

            <HeroTerminalServer className="w-48 h-28 shrink-0 hidden md:block" />
          </div>

          {/* Quick Setup Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Option A: Generate by entering number of services */}
            <div className="p-5 rounded-2xl bg-[#FFFBEB] border-2 border-black shadow-[3px_3px_0px_#000] space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#FACC15] border border-black font-black flex items-center justify-center text-xs">
                  1
                </span>
                <h3 className="font-black text-sm text-black">Enter Number of Services</h3>
              </div>
              <p className="text-xs text-zinc-600 font-bold">
                How many docker containers or background services does this application run?
              </p>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-white border-2 border-black rounded-xl p-1 shadow-[2px_2px_0px_#000]">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNumServicesInput(num)}
                      className={`w-9 h-9 rounded-lg font-black text-xs transition-all cursor-pointer ${
                        numServicesInput === num
                          ? 'bg-[#FACC15] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                          : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={numServicesInput}
                    onChange={(e) => setNumServicesInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 h-9 text-center font-mono font-bold text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:border-black"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleGenerateServicesByCount(numServicesInput);
                    setShowConfigModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-black font-extrabold text-xs border-2 border-black shadow-[3px_3px_0px_#000] flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Configure {numServicesInput} Terminals</span>
                </button>
              </div>
            </div>

            {/* Option B: 1-Click Preset Stacks */}
            <div className="p-5 rounded-2xl bg-[#F0FDF4] border-2 border-black shadow-[3px_3px_0px_#000] space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#22C55E] border border-black font-black flex items-center justify-center text-xs text-white">
                  2
                </span>
                <h3 className="font-black text-sm text-black">1-Click Quick Presets</h3>
              </div>
              <p className="text-xs text-zinc-600 font-bold">
                Choose a pre-filled Docker Compose setup and customize commands:
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleGenerateServicesByCount(2);
                    setShowConfigModal(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-zinc-50 text-black border-2 border-black font-bold text-xs shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer"
                >
                  🐳 Frontend + Backend (2)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleGenerateServicesByCount(3);
                    setShowConfigModal(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-zinc-50 text-black border-2 border-black font-bold text-xs shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer"
                >
                  🐳 Web + API + Database (3)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleGenerateServicesByCount(1);
                    setShowConfigModal(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-zinc-50 text-black border-2 border-black font-bold text-xs shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer"
                >
                  🐳 Single Compose App (1)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeService = services.find((s) => s.id === activeServiceId) || services[0];

  return (
    <div className="space-y-4">
      {/* Top Bar: Service Tabs, Layout Mode & Global Controls */}
      <div className="neo-box p-4 bg-white space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-black/10 pb-3">
          {/* Service Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-thin">
            {services.map((s) => {
              const isSelected = activeServiceId === s.id;
              const status = statusMap[s.id!] || 'STOPPED';
              const color = getColorConfig(s.color);

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveServiceId(s.id!)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap border-2 ${
                    isSelected
                      ? 'bg-[#FACC15] text-black border-black shadow-[2px_2px_0px_#000]'
                      : 'bg-white text-zinc-700 border-black/20 hover:border-black'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status === 'STREAMING'
                        ? 'bg-emerald-500 animate-pulse'
                        : status === 'ERROR'
                        ? 'bg-rose-500'
                        : color.dot
                    }`}
                  />
                  <span>{s.name}</span>
                </button>
              );
            })}
          </div>

          {/* Right Controls: Single vs Grid, Stream All, Configure */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-100 border-2 border-black rounded-xl p-0.5 shadow-[1.5px_1.5px_0px_#000]">
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  viewMode === 'single' ? 'bg-[#FACC15] text-black border border-black shadow-[1px_1px_0px_#000]' : 'text-zinc-600'
                }`}
                title="Single Active Terminal"
              >
                Focused
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#FACC15] text-black border border-black shadow-[1px_1px_0px_#000]' : 'text-zinc-600'
                }`}
                title="Multi-Terminal Split Grid"
              >
                Split Grid ({services.length})
              </button>
            </div>

            {/* Stream All Button */}
            <button
              type="button"
              onClick={handleStartAll}
              className="px-3 py-1.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-black border-2 border-black text-xs font-black shadow-[2px_2px_0px_#000] cursor-pointer inline-flex items-center gap-1.5"
              title="Start streaming logs on all services"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden md:inline">Stream All</span>
            </button>

            {/* Stop All Button */}
            <button
              type="button"
              onClick={handleStopAll}
              className="px-3 py-1.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-black border-2 border-black text-xs font-black shadow-[2px_2px_0px_#000] cursor-pointer inline-flex items-center gap-1.5"
              title="Stop all live streams"
            >
              <Square className="w-3.5 h-3.5 fill-current text-zinc-700" />
              <span className="hidden md:inline">Stop All</span>
            </button>

            {/* Configure Services Button */}
            {currentUser.role === 'MAIN_ADMIN' && (
              <button
                type="button"
                onClick={openConfigModal}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 text-black border-2 border-black text-xs font-black shadow-[2px_2px_0px_#000] cursor-pointer inline-flex items-center gap-1.5"
                title="Manage services and log commands"
              >
                <Settings className="w-3.5 h-3.5 text-black" />
                <span>Configure</span>
              </button>
            )}
          </div>
        </div>

        {/* Current Active Service Command Bar (Single Mode) */}
        {viewMode === 'single' && activeService && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono bg-zinc-50 border-2 border-black/10 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-zinc-500">Service:</span>
              <span className="font-black text-black">{activeService.name}</span>
              <span className="text-zinc-400">|</span>
              <span className="font-bold text-zinc-500">Command:</span>
              <code className="bg-black/5 px-2 py-0.5 rounded text-zinc-800 font-mono font-bold truncate">
                {activeService.log_command}
              </code>
            </div>
            {activeService.working_dir && (
              <span className="text-[11px] text-zinc-500">
                cwd: <code className="text-zinc-700">{activeService.working_dir}</code>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Terminal View Area */}
      {viewMode === 'single' ? (
        activeService && renderTerminal(activeService, fullscreenServiceId === activeService.id)
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {services.map((s) => renderTerminal(s, fullscreenServiceId === s.id))}
        </div>
      )}

      {/* Fullscreen backdrop if active */}
      {fullscreenServiceId && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
          onClick={() => setFullscreenServiceId(null)}
        />
      )}

      {/* Manage Services Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="neo-box w-full max-w-2xl bg-[#FFFDF5] p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FACC15] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
                  <Boxes className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-black">Configure Service Terminals</h3>
                  <p className="text-xs font-bold text-zinc-600">
                    Add or modify services to view separate logs for each container.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="w-8 h-8 rounded-xl bg-white border-2 border-black flex items-center justify-center hover:bg-zinc-100 cursor-pointer shadow-[2px_2px_0px_#000]"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* Quick Generator Controls */}
            <div className="p-4 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-zinc-700">Quick Generator</span>
                <span className="text-xs text-zinc-500 font-bold">{editingServices.length} Services Configured</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-zinc-600">Set total services:</span>
                {[1, 2, 3, 4, 5].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => handleGenerateServicesByCount(cnt)}
                    className="px-2.5 py-1 rounded-lg text-xs font-black bg-zinc-100 hover:bg-[#FACC15] hover:text-black border border-black shadow-[1px_1px_0px_#000] cursor-pointer"
                  >
                    {cnt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const colorKeys = SERVICE_COLORS.map((c) => c.id);
                    setEditingServices((prev) => [
                      ...prev,
                      {
                        name: `Service ${prev.length + 1}`,
                        log_command: `docker compose logs -f --tail=100 service-${prev.length + 1}`,
                        working_dir: '',
                        color: colorKeys[prev.length % colorKeys.length],
                        display_order: prev.length + 1,
                      },
                    ]);
                  }}
                  className="ml-auto px-3 py-1 rounded-lg text-xs font-black bg-[#BAE6FD] text-[#0369A1] border border-black shadow-[1.5px_1.5px_0px_#000] cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Service</span>
                </button>
              </div>
            </div>

            {/* Services List */}
            <div className="space-y-4">
              {editingServices.map((service, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white border-2 border-black shadow-[3px_3px_0px_#000] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-black text-white font-mono font-black text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={service.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingServices((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, name: val } : s))
                          );
                        }}
                        placeholder="Service Name (e.g. Frontend, Backend API)"
                        className="font-black text-sm text-black border border-zinc-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-black w-48 sm:w-60"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Color selection */}
                      <div className="flex items-center gap-1 mr-2">
                        {SERVICE_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setEditingServices((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, color: c.id } : s))
                              );
                            }}
                            className={`w-4 h-4 rounded-full ${c.dot} border ${
                              service.color === c.id ? 'ring-2 ring-black scale-110' : 'opacity-60'
                            }`}
                            title={c.name}
                          />
                        ))}
                      </div>

                      {/* Move up */}
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const arr = [...editingServices];
                            const temp = arr[idx - 1];
                            arr[idx - 1] = arr[idx];
                            arr[idx] = temp;
                            setEditingServices(arr);
                          }}
                          className="p-1 rounded text-zinc-500 hover:text-black"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Move down */}
                      {idx < editingServices.length - 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const arr = [...editingServices];
                            const temp = arr[idx + 1];
                            arr[idx + 1] = arr[idx];
                            arr[idx] = temp;
                            setEditingServices(arr);
                          }}
                          className="p-1 rounded text-zinc-500 hover:text-black"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingServices((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="p-1 rounded text-rose-500 hover:text-rose-700"
                        title="Delete Service"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Log Command Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-zinc-700 flex items-center justify-between">
                      <span>Live Log Command *</span>
                      <span className="text-[11px] font-normal text-zinc-500">
                        e.g. docker compose logs -f --tail=100 &lt;service&gt;
                      </span>
                    </label>
                    <input
                      type="text"
                      value={service.log_command}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingServices((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, log_command: val } : s))
                        );
                      }}
                      placeholder="docker compose logs -f --tail=100 <service>"
                      className="w-full font-mono text-xs bg-zinc-50 border-2 border-black rounded-xl px-3 py-2 focus:outline-none focus:bg-white text-zinc-900 shadow-[1.5px_1.5px_0px_#000]"
                    />

                    {/* Quick Preset command chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const base = service.name.toLowerCase().replace(/\s+/g, '-');
                          setEditingServices((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, log_command: `docker compose logs -f --tail=100 ${base}` } : s
                            )
                          );
                        }}
                        className="text-[10px] font-mono bg-zinc-100 hover:bg-[#FACC15] px-2 py-0.5 rounded border border-zinc-300 text-zinc-700 cursor-pointer"
                      >
                        + compose logs: {service.name.toLowerCase().replace(/\s+/g, '-')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const base = service.name.toLowerCase().replace(/\s+/g, '_');
                          setEditingServices((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, log_command: `docker logs -f --tail=100 ${base}` } : s
                            )
                          );
                        }}
                        className="text-[10px] font-mono bg-zinc-100 hover:bg-[#FACC15] px-2 py-0.5 rounded border border-zinc-300 text-zinc-700 cursor-pointer"
                      >
                        + docker logs: {service.name.toLowerCase().replace(/\s+/g, '_')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingServices((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, log_command: `npm run logs` } : s
                            )
                          );
                        }}
                        className="text-[10px] font-mono bg-zinc-100 hover:bg-[#FACC15] px-2 py-0.5 rounded border border-zinc-300 text-zinc-700 cursor-pointer"
                      >
                        + npm run logs
                      </button>
                    </div>
                  </div>

                  {/* Subdirectory (optional) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600">
                      Working Subdirectory (Optional, defaults to project root)
                    </label>
                    <input
                      type="text"
                      value={service.working_dir || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingServices((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, working_dir: val } : s))
                        );
                      }}
                      placeholder="relative/folder (optional)"
                      className="w-full font-mono text-xs bg-zinc-50 border border-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-black text-zinc-800"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-black">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-black font-extrabold text-xs border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveServices}
                disabled={savingConfig}
                className="px-6 py-2.5 rounded-xl bg-[#FACC15] hover:bg-yellow-400 text-black font-black text-xs border-2 border-black shadow-[3px_3px_0px_#000] cursor-pointer flex items-center gap-2"
              >
                {savingConfig ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Service Terminals</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Remote Command Exec Modal */}
      {execModalService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#FAF7EE] border-2 border-black rounded-2xl shadow-[6px_6px_0px_#000] p-5 sm:p-6 space-y-4 animate-pop-in text-black">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-black" />
                <h3 className="font-black text-base text-black">
                  Execute Command: <span className="font-mono text-blue-700">{execModalService.name}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExecModalService(null)}
                className="p-1.5 rounded-lg border-2 border-black bg-white hover:bg-zinc-100 shadow-[1.5px_1.5px_0px_#000] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scope / Location Toggle */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-zinc-700">Execute in:</label>
              <div className="inline-flex rounded-xl border-2 border-black bg-white p-0.5 shadow-[2px_2px_0px_#000]">
                <button
                  type="button"
                  onClick={() => setExecInContainer(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    execInContainer ? 'bg-[#FACC15] text-black shadow-[1px_1px_0px_#000]' : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  🐳 Container ({execModalService.container_name || execModalService.name})
                </button>
                <button
                  type="button"
                  onClick={() => setExecInContainer(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !execInContainer ? 'bg-[#FACC15] text-black shadow-[1px_1px_0px_#000]' : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  💻 Host Directory
                </button>
              </div>
            </div>

            {/* Quick command presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-extrabold text-black">Presets:</span>
              {[
                'ls -la',
                'npm test',
                'npx prisma migrate status',
                'env',
                'whoami',
                'uptime'
              ].map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => setExecCommand(cmd)}
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-white border border-black hover:bg-[#FEF08A] cursor-pointer shadow-[1px_1px_0px_#000]"
                >
                  {cmd}
                </button>
              ))}
            </div>

            {/* Command Input */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-zinc-500 font-bold select-none text-xs">$</span>
                <input
                  type="text"
                  value={execCommand}
                  onChange={(e) => setExecCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !execRunning) handleRunExec();
                  }}
                  placeholder="e.g. ls -la or npm test"
                  className="neo-input font-mono text-xs pl-7 py-2"
                />
              </div>
              <button
                type="button"
                onClick={handleRunExec}
                disabled={execRunning || !execCommand.trim()}
                className="neo-btn-yellow px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000] shrink-0"
              >
                {execRunning ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{execRunning ? 'Running...' : 'Execute'}</span>
              </button>
            </div>

            {/* Output terminal */}
            {execOutput && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-black">Execution Result:</span>
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-black ${
                      execOutput.exitCode === 0
                        ? 'bg-[#DCFCE7] text-emerald-800'
                        : 'bg-[#FEE2E2] text-rose-800'
                    }`}
                  >
                    Exit Code: {execOutput.exitCode}
                  </span>
                </div>
                <div className="rounded-xl border-2 border-black bg-[#0C0D12] p-3 max-h-60 overflow-y-auto font-mono text-xs leading-relaxed select-text shadow-[2px_2px_0px_#000]">
                  {execOutput.stdout && (
                    <pre className="text-emerald-400 whitespace-pre-wrap">{execOutput.stdout}</pre>
                  )}
                  {execOutput.stderr && (
                    <pre className="text-rose-400 whitespace-pre-wrap">{execOutput.stderr}</pre>
                  )}
                  {!execOutput.stdout && !execOutput.stderr && (
                    <span className="text-zinc-500 italic">(Command exited with no output)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
