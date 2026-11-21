import React from 'react';
import {
  Terminal,
  FolderGit2,
  Users,
  ShieldCheck,
  FileText,
  LogOut,
  UserCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { User } from '../api';

interface NavbarProps {
  user: User;
  activeTab: 'projects' | 'audit' | 'users';
  onSelectTab: (tab: 'projects' | 'audit' | 'users') => void;
  onLogout: () => void;
  pendingUsersCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onLogout,
  pendingUsersCount = 0,
}) => {
  const isMainAdmin = user.role === 'MAIN_ADMIN';

  return (
    <header className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                VAREX
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono font-medium border border-cyan-500/20">
                CI/CD HUB
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Self-Deploying Operations Engine</p>
          </div>
        </div>

        {/* Center Nav Items */}
        <nav className="flex items-center gap-1">
          <button
            onClick={() => onSelectTab('projects')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'projects'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
            Projects
          </button>

          <button
            onClick={() => onSelectTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'audit'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            Audit Logs
          </button>

          {isMainAdmin && (
            <button
              onClick={() => onSelectTab('users')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all relative ${
                activeTab === 'users'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              Users & Approvals
              {pendingUsersCount > 0 && (
                <span className="flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-slate-950 rounded-full animate-pulse">
                  {pendingUsersCount}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* User Badge & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className={`w-2 h-2 rounded-full ${isMainAdmin ? 'bg-purple-400 shadow-sm shadow-purple-400' : 'bg-emerald-400 shadow-sm shadow-emerald-400'}`} />
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-200">{user.name}</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                {isMainAdmin ? (
                  <span className="text-purple-400 font-bold">MAIN ADMIN</span>
                ) : (
                  <span className="text-emerald-400 font-medium">SUB ADMIN</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
