import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  RefreshCw,
  Search,
  Filter,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { AuditLog, api } from '../api';

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

  const getActionBadge = (action: string) => {
    if (action.includes('SUCCESS') || action.includes('APPROVED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-2.5 h-2.5" /> {action}
        </span>
      );
    }
    if (action.includes('FAIL') || action.includes('REJECT') || action.includes('DELETED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
          <XCircle className="w-2.5 h-2.5" /> {action}
        </span>
      );
    }
    if (action.includes('ABORT') || action.includes('PENDING')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-2.5 h-2.5" /> {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-cyan-400" />
            Audit & Operation Trail
          </h2>
          <p className="text-xs text-slate-400">
            Immutable log of all user logins, pipeline runs, and configuration edits. Dual-written to file & database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={api.getRawAuditLogUrl()}
            download="varex-audit.log"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" /> Download audit.log File
          </a>

          <button
            onClick={loadLogs}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              placeholder="Filter by username..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-semibold transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Operations</option>
            <option value="LOGIN">User Logins</option>
            <option value="REGISTER">Registrations</option>
            <option value="APPROVED">User Approvals</option>
            <option value="DEPLOY">Deployments</option>
            <option value="PROJECT">Project Modifications</option>
            <option value="PIPELINE">Pipeline Edits</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-medium">Timestamp</th>
                <th className="py-3 px-4 font-medium">User & Role</th>
                <th className="py-3 px-4 font-medium">IP Address</th>
                <th className="py-3 px-4 font-medium">Action</th>
                <th className="py-3 px-4 font-medium">Target</th>
                <th className="py-3 px-4 font-medium">Operation Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-slate-200">
                    <span className="font-semibold">{log.username}</span>
                    <span className="text-[10px] text-slate-500 ml-1">({log.user_role})</span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">{log.ip_address}</td>
                  <td className="py-2.5 px-4">{getActionBadge(log.action)}</td>
                  <td className="py-2.5 px-4 text-cyan-300 truncate max-w-xs">{log.target || '-'}</td>
                  <td className="py-2.5 px-4 text-slate-400 font-sans text-xs">{log.details || '-'}</td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans text-xs">
                    {loading ? 'Loading audit records...' : 'No audit records found matching your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 bg-slate-950/50 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Showing {logs.length} of {total} total recorded operations</span>
          <span>Log File: data/logs/audit.log</span>
        </div>
      </div>
    </div>
  );
};
