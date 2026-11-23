import React, { useState, useEffect } from 'react';
import {
  FileText,
  Key,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Plus,
  Save,
  Check,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { api } from '../api';
import { FolderPadlockIllustration } from './Illustrations';

interface EnvVariablesViewProps {
  projectId: number;
  projectName: string;
  projectPath: string;
  envFilePath?: string;
  envFileExists?: boolean;
  envFileMtime?: string | null;
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
  projectPath,
  envFilePath,
  envFileExists = false,
  envFileMtime,
  initialEnvVars,
  readOnly = false,
  onSaved,
}) => {
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
    const lines = text.split(/\r?\n/);
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
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeFilePath, setActiveFilePath] = useState(envFilePath || `${projectPath}\\.env`);
  const [activeFileExists, setActiveFileExists] = useState(envFileExists);
  const [activeFileMtime, setActiveFileMtime] = useState(envFileMtime);

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
    if (envFilePath) setActiveFilePath(envFilePath);
    setActiveFileExists(envFileExists);
    if (envFileMtime) setActiveFileMtime(envFileMtime);
  }, [initialEnvVars, envFilePath, envFileExists, envFileMtime]);

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

  const toggleReveal = (index: number) => {
    setRevealedKeys((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleCopyVal = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleReloadFromDisk = async () => {
    setSyncing(true);
    try {
      const res = await api.syncProjectEnv(projectId);
      const parsed = parseEnvToArray(res.project.env_vars || {});
      setItems(parsed);
      setRawText(parseArrayToRaw(parsed));
      setActiveFileExists(res.project.env_file_exists || false);
      setActiveFileMtime(res.project.env_file_mtime || null);
      setToastMessage('Reloaded environment directly from host disk.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage(`Failed to reload from disk: ${err.message}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSyncing(false);
    }
  };

  const executeSave = async (password?: string) => {
    const finalItems = mode === 'raw' ? parseRawToArray(rawText) : items;
    const envObj: Record<string, string> = {};
    for (const item of finalItems) {
      if (item.key.trim()) {
        envObj[item.key.trim()] = item.value;
      }
    }

    try {
      await api.updateProjectEnv(projectId, { env_vars: envObj, sudoPassword: password });
      setHasChanges(false);
      setSaveSuccess(true);
      setShowSudoModal(false);
      setSudoPassword('');
      setSudoError(null);
      setTimeout(() => setSaveSuccess(false), 2000);
      onSaved();
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('password')) {
        setShowSudoModal(true);
        setSudoError(err.message);
      } else {
        alert(`Error saving environment variables: ${err.message}`);
      }
    }
  };

  const handleSaveClick = () => {
    executeSave();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* LEFT COLUMN: Illustration & Info */}
      <div className="lg:col-span-3 neo-box p-5 bg-white flex flex-col items-center text-center space-y-3">
        <FolderPadlockIllustration className="w-40 h-32" />
        <h3 className="text-base font-extrabold text-black">
          Environment Variables &amp; Secrets
        </h3>
        <p className="text-xs text-zinc-600 leading-relaxed">
          Manage configuration and sensitive values for this application. These values are injected during pipeline execution.
        </p>
      </div>

      {/* RIGHT COLUMN: Host Env File & Variables Table */}
      <div className="lg:col-span-9 neo-box p-6 bg-white space-y-5">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-3 rounded-xl bg-[#DCFCE7] border-2 border-black text-[#15803D] font-bold text-xs flex items-center gap-2 shadow-[2px_2px_0px_#000000]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Subcard: Host Environment File (Image 1) */}
        <div className="p-4 rounded-xl border-2 border-black bg-[#FAF7EE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[2px_2px_0px_#000000]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="w-4 h-4 text-black" />
              <span className="font-extrabold text-xs text-black">Host Environment File</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#BFDBFE] text-blue-900 border border-black font-mono text-[11px] font-bold">
                {activeFilePath}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span>Live file on disk</span>
              <span>|</span>
              <span>Modified: {activeFileMtime ? new Date(activeFileMtime).toLocaleString() : '11/23/2026, 1:01:03 PM'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReloadFromDisk}
            disabled={syncing}
            className="neo-btn-white px-3.5 py-1.5 text-xs flex items-center gap-1.5 shrink-0"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Reload from Disk</span>
          </button>
        </div>

        {/* Section Header with Mode Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-black" />
            <div>
              <h4 className="text-sm font-extrabold text-black">Environment Variables &amp; Secrets</h4>
              <p className="text-[11px] text-zinc-600">
                Injected at runtime into all pipeline steps and written directly to the host .env file.
              </p>
            </div>
          </div>

          {/* Structured vs Raw Toggle Pill (Image 1) */}
          <div className="flex items-center border-2 border-black rounded-xl overflow-hidden bg-white shadow-[2px_2px_0px_#000000]">
            <button
              type="button"
              onClick={handleSwitchToStructured}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                mode === 'structured'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-zinc-50'
              }`}
            >
              Structured
            </button>
            <button
              type="button"
              onClick={handleSwitchToRaw}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                mode === 'raw'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-zinc-50'
              }`}
            >
              Raw (.env)
            </button>
          </div>
        </div>

        {/* Content View: Structured Table or Raw Textarea */}
        {mode === 'structured' ? (
          <div className="space-y-3">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-[#FAF7EE] border-2 border-black rounded-xl text-xs font-extrabold text-black select-none">
              <div className="col-span-5">Variable Key</div>
              <div className="col-span-4">Value</div>
              <div className="col-span-3 text-right pr-2">Type</div>
            </div>

            {/* Variable Rows */}
            <div className="space-y-2">
              {items.map((item, idx) => {
                const isRevealed = revealedKeys[idx];

                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2.5 items-center p-2 rounded-xl bg-white hover:bg-zinc-50"
                  >
                    {/* Key Input */}
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={item.key}
                        onChange={(e) => handleUpdateItem(idx, { key: e.target.value })}
                        readOnly={readOnly}
                        placeholder="KEY_NAME"
                        className="neo-input font-mono font-bold"
                      />
                    </div>

                    {/* Value Input with Eye Toggle */}
                    <div className="col-span-4 relative">
                      <input
                        type={isRevealed ? 'text' : 'password'}
                        value={item.value}
                        onChange={(e) => handleUpdateItem(idx, { value: e.target.value })}
                        readOnly={readOnly}
                        placeholder="value"
                        className="neo-input font-mono pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => toggleReveal(idx)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-black"
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Type Badge & Row Actions */}
                    <div className="col-span-3 flex items-center justify-end gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EDE9FE] text-purple-900 border border-black font-extrabold text-[10px] flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Secret
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCopyVal(item.value, item.key)}
                        className="p-1 text-zinc-500 hover:text-black rounded hover:bg-zinc-100"
                        title="Copy value"
                      >
                        {copiedKey === item.key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          title="Delete variable"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Variable Dashed Button (Image 1) */}
            {!readOnly && (
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-black bg-white hover:bg-zinc-50 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[2px_2px_0px_#000000]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Variable</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              rows={10}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setHasChanges(true);
              }}
              readOnly={readOnly}
              className="w-full p-4 rounded-xl border-2 border-black bg-[#0C0D12] text-emerald-400 font-mono text-xs focus:outline-none shadow-[2px_2px_0px_#000000]"
              placeholder="KEY=value"
            />
          </div>
        )}

        {/* Footer Right Save Button (Image 1) */}
        {!readOnly && (
          <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-black">
            <button
              type="button"
              onClick={handleSaveClick}
              className="neo-btn-yellow px-6 py-2.5 text-xs flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saveSuccess ? 'Changes Saved!' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Sudo Password Confirmation Modal (Neobrutalist) */}
      {showSudoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0px_#000000] p-6 relative animate-pop-in text-black">
            <button
              onClick={() => setShowSudoModal(false)}
              className="absolute top-4 right-4 p-1 text-black hover:bg-zinc-100 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000000]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#FACC15] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_#000000]">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-black">Administrator Authorization</h3>
                <p className="text-xs text-zinc-600">Enter your password to update environment secrets.</p>
              </div>
            </div>

            {sudoError && (
              <div className="mb-4 p-3 rounded-xl bg-[#FEE2E2] border-2 border-black text-[#B91C1C] text-xs font-bold flex items-center gap-2 shadow-[2px_2px_0px_#000000]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{sudoError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSudoLoading(true);
                executeSave(sudoPassword).finally(() => setSudoLoading(false));
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-black mb-1">Admin Password</label>
                <input
                  type="password"
                  autoFocus
                  value={sudoPassword}
                  onChange={(e) => setSudoPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="neo-input"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setShowSudoModal(false)}
                  className="neo-btn-white px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sudoLoading}
                  className="neo-btn-yellow px-5 py-2 text-xs flex items-center gap-2"
                >
                  {sudoLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm &amp; Write
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
