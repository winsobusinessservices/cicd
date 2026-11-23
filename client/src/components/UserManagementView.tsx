import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  User as UserIcon,
  Mail,
  Lock,
  Shield,
  Eye,
  EyeOff,
  MoreHorizontal
} from 'lucide-react';
import { User, api } from '../api';
import { DoodleSparks, IdBadgeIllustration, InboxApprovedTrayIllustration } from './Illustrations';

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
  const [showPassword, setShowPassword] = useState(false);
  const [newRole, setNewRole] = useState<'SUB_ADMIN' | 'MAIN_ADMIN'>('SUB_ADMIN');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleApprove = async (userId: number, role: 'SUB_ADMIN' | 'MAIN_ADMIN' = 'SUB_ADMIN') => {
    try {
      await api.approveUser(userId, role);
      setSuccessMsg(`User approved as ${role === 'MAIN_ADMIN' ? 'Main Admin' : 'Sub Admin'}.`);
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
      setSuccessMsg('New administrator account created and approved.');
      setTimeout(() => setSuccessMsg(null), 3000);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create user.');
    }
  };

  const avatarColors = ['bg-[#3B82F6]', 'bg-[#FB7185]', 'bg-[#A855F7]', 'bg-[#F59E0B]', 'bg-[#10B981]'];

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-[#DCFCE7] border-2 border-black text-[#15803D] font-bold text-xs flex items-center gap-2 shadow-[2px_2px_0px_#000000] animate-pop-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-[#FEE2E2] border-2 border-black text-[#B91C1C] font-bold text-xs flex items-center gap-2 shadow-[2px_2px_0px_#000000] animate-pop-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* View Header with Pink Highlight (Image 6) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight flex items-center gap-2 flex-wrap">
              <span>Team Members &amp;</span>
              <span className="highlight-pink">Access Control</span>
            </h2>
            <DoodleSparks className="w-6 h-6 inline-block" />
          </div>
          <p className="text-xs text-zinc-600 mt-1 font-medium">
            Manage authorized operators and review new account requests.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="neo-btn-yellow px-5 py-2.5 text-xs flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Section 1: Pending Approvals (Image 6) */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#38BDF8] text-black font-extrabold text-xs border-2 border-black shadow-[2px_2px_0px_#000000]">
          <span>Pending Approvals</span>
          <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center font-bold text-[11px] border border-black">
            {pendingUsers.length}
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-[#EFF6FF] border-2 border-black shadow-[3px_3px_0px_#000000]">
          {pendingUsers.length === 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center sm:justify-start">
              <InboxApprovedTrayIllustration className="w-28 h-24 shrink-0" />
              <div className="sm:border-l-2 sm:border-black/20 sm:pl-6 text-center sm:text-left">
                <h4 className="text-base font-extrabold text-black">No pending registration requests.</h4>
                <p className="text-xs text-zinc-600 mt-1 font-medium">New requests will appear here for review.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((pUser) => (
                <div
                  key={pUser.id}
                  className="p-3.5 rounded-xl bg-white border-2 border-black flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[2px_2px_0px_#000000]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FACC15] border-2 border-black text-black font-black flex items-center justify-center text-xs">
                      {pUser.username.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-black">{pUser.name || pUser.username}</p>
                      <p className="text-[11px] text-zinc-600 font-mono">{pUser.email || `@${pUser.username}`}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(pUser.id, 'SUB_ADMIN')}
                      className="neo-btn-yellow px-3 py-1.5 text-xs flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Approve Sub Admin
                    </button>
                    <button
                      onClick={() => handleApprove(pUser.id, 'MAIN_ADMIN')}
                      className="neo-btn-white px-3 py-1.5 text-xs flex items-center gap-1"
                    >
                      Approve Admin
                    </button>
                    <button
                      onClick={() => handleReject(pUser.id)}
                      className="neo-btn-danger px-3 py-1.5 text-xs flex items-center gap-1"
                    >
                      <UserX className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Active Team Roster (Image 6) */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FACC15] text-black font-extrabold text-xs border-2 border-black shadow-[2px_2px_0px_#000000]">
          <span>Active Team Roster</span>
          <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center font-bold text-[11px] border border-black">
            {allUsers.length || 2}
          </span>
        </div>

        <div className="neo-box p-3 sm:p-4 bg-white overflow-hidden">
          <div className="overflow-x-auto -mx-1 sm:mx-0">
            <table className="w-full text-left text-xs min-w-[560px]">
              <thead>
                <tr className="border-b-2 border-black bg-[#FAF7EE] text-black font-extrabold">
                  <th className="py-2.5 px-3">Name &amp; Username</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Authorized Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/10">
                {allUsers.map((u, i) => {
                  const isCurrent = u.id === currentUser.id;
                  const initial = u.name ? u.name.slice(0, 1).toUpperCase() : u.username ? u.username.slice(0, 1).toUpperCase() : 'U';
                  const avatarColor = avatarColors[i % avatarColors.length];

                  return (
                    <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg ${avatarColor} text-white font-extrabold flex items-center justify-center border-2 border-black shadow-[1.5px_1.5px_0px_#000000]`}>
                            {initial}
                          </div>
                          <div>
                            <div className="font-extrabold text-black flex items-center gap-1.5">
                              <span>{u.name || u.username}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded-full bg-[#FEF08A] text-black border border-black text-[10px] font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono">@{u.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-zinc-700 font-medium">
                        {u.email || '—'}
                      </td>

                      <td className="py-3 px-3">
                        {isCurrent ? (
                          <span className={`px-2.5 py-1 rounded-lg border-2 border-black font-extrabold text-[11px] ${u.role === 'MAIN_ADMIN' ? 'bg-[#E9D5FF] text-purple-900' : 'bg-[#BFDBFE] text-blue-900'}`}>
                            {u.role === 'MAIN_ADMIN' ? 'MAIN ADMIN' : 'SUB ADMIN'}
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                            className="bg-[#BFDBFE] hover:bg-[#93C5FD] text-black font-extrabold text-[11px] border-2 border-black rounded-lg px-2 py-1 cursor-pointer focus:outline-none"
                          >
                            <option value="SUB_ADMIN">SUB ADMIN</option>
                            <option value="MAIN_ADMIN">MAIN ADMIN</option>
                          </select>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-zinc-600 font-medium">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '11/23/2026'}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {!isCurrent && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-1.5 rounded-lg border-2 border-black bg-white hover:bg-rose-50 text-zinc-700 hover:text-rose-600 shadow-[1.5px_1.5px_0px_#000000]"
                            title="Delete User"
                          >
                            <MoreHorizontal className="w-4 h-4" />
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
      </div>

      {/* Create Approved Member Modal (Image 5) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-white border-2 border-black rounded-3xl shadow-[4px_4px_0px_#000000] sm:shadow-[6px_6px_0px_#000000] p-4 sm:p-7 relative animate-pop-in text-black my-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1 text-black hover:bg-zinc-100 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000000] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with Yellow Highlight & Sparks (Image 5) */}
            <div className="mb-5 pr-8 sm:pr-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-black">
                  <span>Create </span>
                  <span className="highlight-yellow">Approved Member</span>
                </h3>
                <DoodleSparks className="w-5 h-5 inline-block" />
              </div>
              <p className="text-xs text-zinc-600 mt-1 font-medium">
                Add a team member and assign their access role.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Form on Left */}
              <form onSubmit={handleAddDirect} className="md:col-span-7 lg:col-span-8 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-black mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Alex Hunter"
                      className="neo-input pl-9"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black mb-1">Username</label>
                  <div className="relative">
                    <span className="text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs">@</span>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. alex_dev"
                      className="neo-input pl-9 font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. alex@company.com"
                      className="neo-input pl-9 font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Temporary password (min 6 chars)"
                      className="neo-input pl-9 pr-8"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-black"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black mb-1">Role</label>
                  <div className="relative">
                    <Shield className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="neo-input pl-9 cursor-pointer"
                    >
                      <option value="SUB_ADMIN">Sub Admin (Deploy &amp; Operations)</option>
                      <option value="MAIN_ADMIN">Main Administrator (Full Access)</option>
                    </select>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-black">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="neo-btn-white px-4 py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="neo-btn-yellow px-5 py-2 text-xs font-extrabold"
                  >
                    Create Member
                  </button>
                </div>
              </form>

              {/* ID Badge Illustration on Right (Image 5) */}
              <div className="md:col-span-4 flex items-center justify-center">
                <IdBadgeIllustration className="w-36 h-48" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
