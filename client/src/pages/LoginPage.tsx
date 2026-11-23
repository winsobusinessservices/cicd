import React, { useState } from 'react';
import { Lock, User as UserIcon, ArrowRight, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api, setAuthToken, User } from '../api';
import { BackgroundDecorations, DoodleSparks, HeroServerPadlock } from '../components/Illustrations';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onNavigateRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({ username: username.trim(), password });
      setAuthToken(res.token);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF7EE] relative overflow-hidden select-none">
      <BackgroundDecorations />

      <div className="w-full max-w-md bg-white border-2 border-black rounded-3xl shadow-[8px_8px_0px_#000000] p-8 relative z-10 animate-pop-in text-black">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#FACC15] border-2 border-black mx-auto flex items-center justify-center mb-3 text-black font-black font-mono text-xl shadow-[3px_3px_0px_#000000]">
            &gt;_
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-2xl font-black tracking-tight text-black">VAREX CI/CD</h1>
            <DoodleSparks className="w-5 h-5" />
          </div>
          <p className="text-xs text-zinc-600 mt-1 font-medium">
            Sign in to manage pipelines, servers, and deployments.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#FEE2E2] border-2 border-black text-[#B91C1C] text-xs font-bold flex items-start gap-2 shadow-[2px_2px_0px_#000000]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-black mb-1">
              Username or Email
            </label>
            <div className="relative">
              <UserIcon className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="neo-input pl-9"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-black mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="neo-input pl-9 pr-8"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full neo-btn-yellow py-3 text-xs flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
              </>
            ) : (
              <>
                <span>Sign In to Varex</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t-2 border-black/10 text-center text-xs text-zinc-600">
          <span>Need an account? </span>
          <button
            type="button"
            onClick={onNavigateRegister}
            className="font-extrabold text-black underline hover:text-zinc-700"
          >
            Request Access
          </button>
        </div>
      </div>
    </div>
  );
};
