import React, { useState, useEffect } from 'react';
import {
  Key,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Save,
  Check,
  FileCode,
  ListOrdered,
  Lock,
  AlertTriangle,
  X,
  Loader2,
  Copy
} from 'lucide-react';
import { api } from '../api';

interface EnvVariablesViewProps {
  projectId: number;
  projectName: string;
  initialEnvVars: Record<string, string>;
  readOnly?: boolean;
  onSaved: () => void;
}

interface EnvItem {
  key: string;
  value: string;
  isSecret: boolean;
}

export const EnvVariablesView: React.FC<EnvVariablesViewProps> = ({
  projectId,
  projectName,
  initialEnvVars,
  readOnly = false,
  onSaved,
}) => {
  // Convert object to array
  const parseEnvToArray = (obj: Record<string, string>): EnvItem[] => {
    return Object.entries(obj).map(([key, value]) => ({
      key,
      value,
      isSecret: true,
    }));
  };

  const parseArrayToRaw = (items: EnvItem[]): string => {
    return items
      .filter((i) => i.key.trim() !== '')
      .map((i) => `${i.key}=${i.value}`)
      .join('\n');
  };

  const parseRawToArray = (text: string): EnvItem[] => {
    const lines = text.split('\n');
    const items: EnvItem[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (key) {
          items.push({ key, value, isSecret: true });
        }
      }
    }
    return items;
  };

  const [items, setItems] = useState<EnvItem[]>(parseEnvToArray(initialEnvVars));
  const [mode, setMode] = useState<'structured' | 'raw'>('structured');
  const [rawText, setRawText] = useState<string>(parseArrayToRaw(parseEnvToArray(initialEnvVars)));
  const [hasChanges, setHasChanges] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sudo Modal State
  const [showSudoModal, setShowSudoModal] = useState(false);
  const [sudoPassword, setSudoPassword] = useState('');
  const [sudoLoading, setSudoLoading] = useState(false);
  const [sudoError, setSudoError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const parsed = parseEnvToArray(initialEnvVars);
    setItems(parsed);
    setRawText(parseArrayToRaw(parsed));
    setHasChanges(false);
  }, [initialEnvVars]);

  // Mode switching
  const handleSwitchToRaw = () => {
    setRawText(parseArrayToRaw(items));
    setMode('raw');
  };

  const handleSwitchToStructured = () => {
    setItems(parseRawToArray(rawText));
    setMode('structured');
  };

  const handleAddItem = () => {
    if (readOnly) return;
    setItems([...items, { key: '', value: '', isSecret: true }]);
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleUpdateItem = (index: number, patch: Partial<EnvItem>) => {
    if (readOnly) return;
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    setItems(next);
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleRemoveItem = (index: number) => {
    if (readOnly) return;
    setItems(items.filter((_, i) => i !== index));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleCopyValue = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open Sudo Challenge
  const handleTriggerSave = () => {
    setSudoError(null);
    setSudoPassword('');
    setShowSudoModal(true);
  };

  // Execute Save with Sudo Password
  const handleConfirmSudoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sudoPassword) {
      setSudoError('Please enter the server sudo or administrator password.');
      return;
    }

    setSudoLoading(true);
    setSudoError(null);

    // Prepare dictionary
    let envObj: Record<string, string> = {};
    if (mode === 'raw') {
      const parsed = parseRawToArray(rawText);
      for (const p of parsed) {
        if (p.key) envObj[p.key] = p.value;
      }
    } else {
      for (const it of items) {
        const k = it.key.trim();
        if (k) envObj[k] = it.value;
      }
    }

    try {
      await api.updateProjectEnv(projectId, {
        env_vars: envObj,
        sudoPassword,
      });

      setSaveSuccess(true);
      setHasChanges(false);
      setShowSudoModal(false);
      setSudoPassword('');
      onSaved();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSudoError(err.message || 'Sudo verification failed.');
    } finally {
      setSudoLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            Environment Variables & Secrets
          </h3>
          <p className="text-xs text-slate-400">
            Runtime environment parameters injected into host pipeline steps. Protected by strict server sudo authorization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={handleSwitchToStructured}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                mode === 'structured'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" /> Structured
            </button>
            <button
              type="button"
              onClick={handleSwitchToRaw}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                mode === 'raw'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" /> .env Raw
            </button>
          </div>

          {readOnly ? (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
              <Lock className="w-3.5 h-3.5 text-amber-400" /> Read-Only
            </span>
          ) : (
            <button
              type="button"
              onClick={handleTriggerSave}
              disabled={!hasChanges}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : hasChanges
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              {saveSuccess ? 'Saved with Sudo!' : 'Save (Requires Sudo)'}
            </button>
          )}
        </div>
      </div>

      {/* Sudo Required Warning Banner */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-300 text-xs">
        <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>
          <strong>Elevated Security Gate:</strong> Any modifications to environment variables or credentials require entering the host server sudo / administrator password upon saving.
        </span>
      </div>

      {/* Content Area */}
      {mode === 'structured' ? (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              {/* Variable Key */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Variable Key</label>
                <input
                  type="text"
                  value={item.key}
                  readOnly={readOnly}
                  onChange={(e) => handleUpdateItem(idx, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase() })}
                  placeholder="e.g. DATABASE_URL, PORT, API_KEY"
                  className={`w-full bg-[#070a12] border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-xs text-cyan-300 ${
                    readOnly ? 'cursor-default' : 'focus:outline-none focus:border-cyan-500'
                  }`}
                />
              </div>

              {/* Variable Value */}
              <div className="flex-[2] min-w-[240px]">
                <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Value</label>
                <div className="relative flex items-center">
                  <input
                    type={item.isSecret ? 'password' : 'text'}
                    value={item.value}
                    readOnly={readOnly}
                    onChange={(e) => handleUpdateItem(idx, { value: e.target.value })}
                    placeholder="Enter variable value or secret string"
                    className={`w-full bg-[#070a12] border border-slate-800 rounded-lg px-2.5 py-1.5 pr-16 font-mono text-xs text-slate-200 ${
                      readOnly ? 'cursor-default' : 'focus:outline-none focus:border-cyan-500'
                    }`}
                  />
                  <div className="absolute right-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateItem(idx, { isSecret: !item.isSecret })}
                      title={item.isSecret ? 'Show Value' : 'Mask Value'}
                      className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {item.isSecret ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyValue(item.key, item.value)}
                      title="Copy Value"
                      className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {copiedKey === item.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {!readOnly && (
                <div className="sm:self-end pb-1">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    title="Remove Variable"
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {items.length === 0 && (
            <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl">
              <Key className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-xs mb-3">No environment variables or secrets configured for this project.</p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-xs font-semibold border border-slate-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Variable
                </button>
              )}
            </div>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-500/5 text-slate-400 hover:text-cyan-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Environment Variable
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={rawText}
            readOnly={readOnly}
            onChange={(e) => {
              setRawText(e.target.value);
              setHasChanges(true);
            }}
            placeholder="PORT=3000&#10;NODE_ENV=production&#10;DATABASE_URL=postgresql://user:pass@localhost:5432/db"
            rows={10}
            className={`w-full bg-[#070a12] border border-slate-800 rounded-xl p-4 font-mono text-xs text-cyan-300 leading-relaxed ${
              readOnly ? 'cursor-default' : 'focus:outline-none focus:border-cyan-500'
            }`}
          />
          <p className="text-[11px] text-slate-500 font-mono">
            Format: KEY=VALUE (one per line). Lines starting with # are ignored.
          </p>
        </div>
      )}

      {/* SUDO AUTHORIZATION MODAL */}
      {showSudoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setShowSudoModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Sudo Authorization Required</h3>
                <p className="text-xs text-slate-400">Target Project: {projectName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Modifying environment variables and secrets is a privileged action. Enter the server sudo user password or administrator password to authorize this update.
            </p>

            {sudoError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{sudoError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmSudoSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Server Sudo / Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoFocus
                    value={sudoPassword}
                    onChange={(e) => setSudoPassword(e.target.value)}
                    placeholder="Enter sudo password"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSudoModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sudoLoading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  {sudoLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying Sudo...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" /> Authorize & Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
