import React, { useState } from 'react';
import { Lock, User, Mail, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../api';
import { BackgroundDecorations, DoodleSparks } from '../components/Illustrations';

interface RegisterPageProps {
  onNavigateLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateLogin }) => {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      await api.register({
        username: username.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF7EE] relative overflow-hidden select-none">
      <BackgroundDecorations />

      <div className="w-full max-w-md bg-white border-2 border-black rounded-3xl shadow-[8px_8px_0px_#000000] p-8 relative z-10 animate-pop-in text-black">
        <button
          onClick={onNavigateLogin}
          className="neo-btn-white px-3 py-1.5 text-xs flex items-center gap-1.5 mb-5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </button>

        {success ? (
          <div className="text-center py-6 animate-pop-in">
            <div className="w-16 h-16 rounded-full bg-[#DCFCE7] border-2 border-black text-[#15803D] flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_#000000]">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h2 className="text-xl font-black text-black mb-2">Request Submitted</h2>
            <p className="text-xs text-zinc-600 leading-relaxed max-w-xs mx-auto mb-6 font-medium">
              Your account registration has been submitted and is pending administrator approval before you can sign in.
            </p>
            <button
              onClick={onNavigateLogin}
              className="neo-btn-yellow px-6 py-2.5 text-xs"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-2xl font-black text-black">Request Access</h1>
                <DoodleSparks className="w-5 h-5" />
              </div>
              <p className="text-xs text-zinc-600 mt-1 font-medium">
                Register account for administrator approval.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-[#FEE2E2] border-2 border-black text-[#B91C1C] text-xs font-bold flex items-center gap-2 shadow-[2px_2px_0px_#000000]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-black mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Hunter"
                    required
                    className="neo-input pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Username</label>
                <div className="relative">
                  <span className="text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="alex_dev"
                    required
                    className="neo-input pl-9 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    required
                    className="neo-input pl-9 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    className="neo-input pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="neo-input pl-9"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full neo-btn-yellow py-3 text-xs flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Registration Request'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
