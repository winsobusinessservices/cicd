import React, { useState } from 'react';
import {
  Layers,
  FileText,
  Users,
  ChevronDown,
  KeyRound,
  LogOut,
  X,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { User, api } from '../api';

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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      setPasswordSuccess(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(null);
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const initial = user.name ? user.name.slice(0, 1).toUpperCase() : user.username ? user.username.slice(0, 1).toUpperCase() : 'U';

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#0C0D12] text-white border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FACC15] border-2 border-black flex items-center justify-center font-mono font-black text-black text-base shadow-[1.5px_1.5px_0px_#000000]">
              &gt;_
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-wider text-white">VAREX</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                CI/CD
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-zinc-800 hidden md:block" />

          {/* Navigation Links */}
          <nav className="flex items-center gap-2">
            <button
              onClick={() => onSelectTab('projects')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-[#FACC15] text-black border-2 border-black shadow-[2px_2px_0px_#000000]'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${activeTab === 'projects' ? 'text-black' : 'text-zinc-400'}`} />
              <span>Applications</span>
            </button>

            <button
              onClick={() => onSelectTab('audit')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-[#FACC15] text-black border-2 border-black shadow-[2px_2px_0px_#000000]'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${activeTab === 'audit' ? 'text-black' : 'text-zinc-400'}`} />
              <span>Audit Trail</span>
            </button>

            {isMainAdmin && (
              <button
                onClick={() => onSelectTab('users')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                  activeTab === 'users'
                    ? 'bg-[#FACC15] text-black border-2 border-black shadow-[2px_2px_0px_#000000]'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Users className={`w-3.5 h-3.5 ${activeTab === 'users' ? 'text-black' : 'text-zinc-400'}`} />
                <span>Team</span>
                {pendingUsersCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-[#EF4444] text-white border border-black rounded-full">
                    {pendingUsersCount}
                  </span>
                )}
              </button>
            )}
          </nav>

          <div className="h-6 w-[1px] bg-zinc-800 hidden md:block" />

          {/* User Controls */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 px-2 py-1 rounded-xl hover:bg-zinc-800/60 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-white text-black font-extrabold text-sm flex items-center justify-center border-2 border-black shadow-[1.5px_1.5px_0px_#000000]">
                {initial}
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-xs font-bold text-white tracking-tight">{user.name || user.username}</div>
                <div className="text-[10px] text-zinc-400 font-medium">
                  {isMainAdmin ? 'Admin' : 'Member'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {/* Profile Menu Dropdown */}
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white text-black border-2 border-black rounded-xl shadow-[4px_4px_0px_#000000] p-1.5 z-50 animate-pop-in">
                  <div className="px-3 py-2 border-b-2 border-black mb-1 bg-[#FAF7EE] rounded-lg">
                    <p className="text-xs font-bold text-black truncate">{user.name || user.username}</p>
                    <p className="text-[11px] text-zinc-600 truncate">{user.email || `@${user.username}`}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowPasswordModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-black hover:bg-[#FACC15] transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Change Password</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Dialog (Neobrutalist) */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0px_#000000] p-6 relative animate-pop-in text-black">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 p-1.5 text-black hover:bg-zinc-100 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000000] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#FACC15] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_#000000]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-black">Change Password</h3>
                <p className="text-xs text-zinc-600">Update your account credentials securely.</p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-[#DCFCE7] border-2 border-black text-[#15803D] text-xs font-bold flex items-center gap-2 shadow-[2px_2px_0px_#000000]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="mb-4 p-3 rounded-xl bg-[#FEE2E2] border-2 border-black text-[#B91C1C] text-xs font-bold flex items-center gap-2 shadow-[2px_2px_0px_#000000]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-black mb-1">Current Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoFocus
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="neo-input pl-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="neo-input pl-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="neo-input pl-9"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="neo-btn-white px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="neo-btn-yellow px-5 py-2 text-xs flex items-center gap-1.5"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
