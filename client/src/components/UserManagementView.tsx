import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  ShieldAlert,
  Clock,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { User, api } from '../api';

interface UserManagementViewProps {
  currentUser: User;
  pendingUsers: User[];
  allUsers: User[];
  onRefresh: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUser,
  pendingUsers,
  allUsers,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'SUB_ADMIN' | 'MAIN_ADMIN'>('SUB_ADMIN');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleApprove = async (userId: number, role: 'SUB_ADMIN' | 'MAIN_ADMIN' = 'SUB_ADMIN') => {
    try {
      await api.approveUser(userId, role);
      setSuccessMsg(`User successfully approved as ${role}!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Approval failed.');
    }
  };

  const handleReject = async (userId: number) => {
    if (!confirm('Reject and delete this registration request?')) return;
    try {
      await api.rejectUser(userId);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Rejection failed.');
    }
  };

  const handleRoleChange = async (userId: number, role: 'SUB_ADMIN' | 'MAIN_ADMIN') => {
    try {
      await api.updateUserRole(userId, role);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Role change failed.');
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteUser(userId);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Delete failed.');
    }
  };

  const handleAddDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createApprovedUser({
        username: newUsername.trim(),
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });
      setShowAddModal(false);
      setNewUsername('');
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setSuccessMsg('User created and approved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create user.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            User Access & Approvals
          </h2>
          <p className="text-xs text-slate-400">
            Control platform access. Newly registered accounts require Main Admin approval before logging in.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Create Sub Admin
        </button>
      </div>

      {/* Section 1: Pending Approvals Queue */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-sm text-slate-100">
              Pending Registrations Awaiting Approval ({pendingUsers.length})
            </h3>
          </div>
          {pendingUsers.length > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
              Action Required
            </span>
          )}
        </div>

        {pendingUsers.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            No pending registration requests. All accounts are up to date.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 mt-3">
            {pendingUsers.map((u) => (
              <div key={u.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-200">{u.name}</span>
                    <span className="text-xs font-mono text-cyan-400">@{u.username}</span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                    <span>{u.email}</span>
                    <span>•</span>
                    <span>Requested: {new Date(u.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(u.id, 'SUB_ADMIN')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-semibold transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Approve Sub Admin
                  </button>
                  <button
                    onClick={() => handleApprove(u.id, 'MAIN_ADMIN')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5" /> Approve Main Admin
                  </button>
                  <button
                    onClick={() => handleReject(u.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Reject"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Active Users Roster */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <h3 className="font-semibold text-sm text-slate-100 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          Active Platform Users ({allUsers.filter((u) => u.isApproved).length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="pb-2.5 font-medium">Name & Username</th>
                <th className="pb-2.5 font-medium">Email</th>
                <th className="pb-2.5 font-medium">Platform Role</th>
                <th className="pb-2.5 font-medium">Approved Details</th>
                <th className="pb-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {allUsers
                .filter((u) => u.isApproved)
                .map((u) => {
                  const isSelf = u.id === currentUser.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 text-slate-200">
                        <div className="font-semibold flex items-center gap-1.5">
                          {u.name}
                          {isSelf && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px]">@{u.username}</div>
                      </td>
                      <td className="py-3 text-slate-300">{u.email}</td>
                      <td className="py-3">
                        <select
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                          className={`bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-semibold focus:outline-none ${
                            u.role === 'MAIN_ADMIN' ? 'text-purple-400 border-purple-500/30' : 'text-emerald-400 border-emerald-500/30'
                          } ${isSelf ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <option value="SUB_ADMIN">SUB ADMIN</option>
                          <option value="MAIN_ADMIN">MAIN ADMIN</option>
                        </select>
                      </td>
                      <td className="py-3 text-slate-400 text-[11px]">
                        <div>{u.approvedAt ? new Date(u.approvedAt).toLocaleDateString() : 'N/A'}</div>
                        <div className="text-slate-500 text-[10px]">By: {u.approvedBy || 'SYSTEM'}</div>
                      </td>
                      <td className="py-3 text-right">
                        {!isSelf && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            title="Delete user"
                            className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Direct Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" /> Create Approved Administrator
            </h3>
            <form onSubmit={handleAddDirect} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Alex Hunter"
                  required
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="alex_dev"
                  required
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="alex@company.com"
                  required
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Temporary password (min 6 chars)"
                  required
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="SUB_ADMIN">SUB ADMIN (Deploy & Project Operations)</option>
                  <option value="MAIN_ADMIN">MAIN ADMIN (Full Platform Control)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-semibold shadow-md"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
