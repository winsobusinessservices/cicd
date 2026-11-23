import React, { useState, useEffect } from 'react';
import {
  Download,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Play,
  Code2,
  AlertTriangle
} from 'lucide-react';
import { AuditLog, api } from '../api';
import { DoodleSparks, AuditMagnifierChecklist } from './Illustrations';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchUser, setSearchUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        limit: 100,
        username: searchUser || undefined,
        action: selectedAction || undefined,
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [selectedAction]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  const getActionPill = (action: string) => {
    if (action.includes('SUCCESS') || action.includes('APPROVED')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#DCFCE7] text-[#15803D] border-2 border-black shadow-[1.5px_1.5px_0px_#000000]">
          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{action}</span>
        </span>
      );
    }
    if (action.includes('FAIL') || action.includes('REJECT') || action.includes('DELETED')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#FEE2E2] text-[#B91C1C] border-2 border-black shadow-[1.5px_1.5px_0px_#000000]">
          <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{action}</span>
        </span>
      );
    }
    if (action.includes('START') || action.includes('TRIGGER')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#DBEAFE] text-[#1D4ED8] border-2 border-black shadow-[1.5px_1.5px_0px_#000000]">
          <Play className="w-3 h-3 fill-current stroke-[2]" />
          <span>{action}</span>
        </span>
      );
    }
    if (action.includes('UPDATE') || action.includes('STEP')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#E0F2FE] text-[#0369A1] border-2 border-black shadow-[1.5px_1.5px_0px_#000000]">
          <Code2 className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{action}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#FAF7EE] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000]">
        <span>{action}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* View Header with Magnifier & Checklist Illustration (Image 7) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight flex items-center gap-2 flex-wrap">
              <span>Audit Trail &amp;</span>
              <span className="highlight-pink">Operation Logs</span>
            </h2>
            <DoodleSparks className="w-6 h-6 inline-block" />
          </div>
          <p className="text-xs text-zinc-600 mt-1 font-medium">
            Immutable log of logins, deployment events, and configuration updates.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <AuditMagnifierChecklist className="w-44 h-24 hidden sm:block" />

          <div className="flex items-center gap-2">
            <a
              href={api.getRawAuditLogUrl()}
              download="varex-audit.log"
              className="neo-btn-white px-3.5 py-2 text-xs flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .log File</span>
            </a>

            <button
              onClick={loadLogs}
              disabled={loading}
              className="neo-btn-white p-2 text-xs"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar (Image 7) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              placeholder="Filter by username..."
              className="neo-input pl-9"
            />
          </div>
          <button
            type="submit"
            className="neo-btn-yellow px-4 py-2 text-xs flex items-center gap-1.5 shrink-0"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="neo-input font-bold text-xs cursor-pointer"
          >
            <option value="">All Operations</option>
            <option value="DEPLOY_SUCCESS">DEPLOY_SUCCESS</option>
            <option value="DEPLOY_START">DEPLOY_START</option>
            <option value="DEPLOY_FAILED">DEPLOY_FAILED</option>
            <option value="PIPELINE_STEPS_UPDATED">PIPELINE_STEPS_UPDATED</option>
            <option value="ENV_VARS_UPDATED">ENV_VARS_UPDATED</option>
            <option value="USER_APPROVED">USER_APPROVED</option>
          </select>
        </div>
      </div>

      {/* Table Card (Image 7) */}
      <div className="neo-box p-3 sm:p-4 bg-white overflow-hidden">
        <div className="overflow-x-auto -mx-1 sm:mx-0">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead>
              <tr className="border-b-2 border-black bg-[#FAF7EE] text-black font-extrabold">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">User &amp; Role</th>
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Target</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/10">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-3 px-3 font-mono text-zinc-700 font-medium whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#818CF8] text-white font-extrabold flex items-center justify-center text-xs border-2 border-black shadow-[1px_1px_0px_#000000]">
                        {(log.username || 'A').slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-extrabold text-black">{log.username || 'system'}</div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase">{log.user_role || 'ADMIN'}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 font-mono text-zinc-600 font-medium">
                    {log.ip_address || '127.0.0.1'}
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap">
                    {getActionPill(log.action)}
                  </td>

                  <td className="py-3 px-3 font-bold text-black whitespace-nowrap">
                    {log.target || '—'}
                  </td>

                  <td className="py-3 px-3 text-zinc-700 leading-snug max-w-xs break-words">
                    {log.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
