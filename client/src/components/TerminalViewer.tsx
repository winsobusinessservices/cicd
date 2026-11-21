import React, { useEffect, useRef, useState } from 'react';
import Ansi from 'ansi-to-html';
import {
  Terminal as TerminalIcon,
  Copy,
  Check,
  Download,
  Trash2,
  Square,
  ArrowDown,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

const ansiConverter = new Ansi({
  fg: '#cbd5e1',
  bg: '#0b0f19',
  newline: false, // Keep false: .terminal-output uses white-space: pre-wrap so \n is rendered naturally without double breaks
  escapeXML: true,
  stream: true,
});

interface TerminalViewerProps {
  deploymentId: number;
  projectName: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'ABORTED';
  logs: string;
  durationMs?: number;
  onAbort?: () => void;
  onClose?: () => void;
}

export const TerminalViewer: React.FC<TerminalViewerProps> = ({
  deploymentId,
  projectName,
  status,
  logs,
  durationMs,
  onAbort,
  onClose,
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (autoScroll) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const blob = new Blob([logs], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `varex-deploy-${projectName}-#${deploymentId}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const cleanLogs = (logs || '').replace(/^\s+/, '');
  const displayContent = cleanLogs || (status === 'RUNNING' ? 'Starting deployment...\n' : 'No logs recorded.');
  const htmlLogs = ansiConverter.toHtml(displayContent);

  return (
    <div className="flex flex-col h-full bg-[#070a12] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Terminal Titlebar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d1424] border-b border-slate-800 select-none">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80 border border-red-600/40" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/40" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/40" />
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <TerminalIcon className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-xs font-semibold text-slate-200">
              {projectName} <span className="text-slate-500">#{deploymentId}</span>
            </span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5 ml-2">
            {status === 'RUNNING' && (
              <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> RUNNING
              </span>
            )}
            {status === 'SUCCESS' && (
              <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" /> SUCCESS
              </span>
            )}
            {status === 'FAILED' && (
              <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                <XCircle className="w-3 h-3" /> FAILED
              </span>
            )}
            {status === 'ABORTED' && (
              <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-3 h-3" /> ABORTED
              </span>
            )}
          </div>
        </div>

        {/* Terminal Controls */}
        <div className="flex items-center gap-2">
          {status === 'RUNNING' && onAbort && (
            <button
              onClick={onAbort}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 transition-colors"
            >
              <Square className="w-3 h-3 fill-current" /> Abort
            </button>
          )}

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title="Toggle Auto-Scroll"
            className={`p-1.5 rounded text-xs transition-colors ${
              autoScroll ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopyLogs}
            title="Copy Logs"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleDownloadLogs}
            title="Download Log File"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 text-xs text-slate-400 hover:text-slate-100 transition-colors px-2 py-1"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Terminal View Body */}
      <div className="flex-1 p-3.5 font-mono text-[13px] leading-normal overflow-y-auto select-text bg-[#070a12]">
        <div
          className="terminal-output text-slate-300"
          dangerouslySetInnerHTML={{ __html: htmlLogs }}
        />
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Footer Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#0b0f19] border-t border-slate-800 text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span>Target: Host Subshell</span>
          <span>Encoding: UTF-8</span>
        </div>
        {durationMs ? <span>Duration: {(durationMs / 1000).toFixed(2)}s</span> : null}
      </div>
    </div>
  );
};
