import React, { useState } from 'react';
import {
  X,
  Folder,
  Layers,
  Terminal,
  Zap,
  Plus,
  Trash2,
  Lock,
  Loader2,
  FileText,
  FileCode,
  Code2
} from 'lucide-react';
import { PipelineStep } from '../api';
import { DoodleSparks, CreateProjectBoxIllustration } from './Illustrations';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description: string;
    project_path: string;
    env_vars: Record<string, string>;
    steps: PipelineStep[];
  }) => Promise<void>;
}

const DEFAULT_SCRIPT = `git pull origin main
npm run build`;

const QUICK_SNIPPETS = [
  { label: 'Git Pull', cmd: 'git pull origin main', bg: 'bg-[#BAE6FD]' },
  { label: 'NPM Build', cmd: 'npm run build', bg: 'bg-[#DDD6FE]' },
  { label: 'Docker Up', cmd: 'docker compose up -d --build', bg: 'bg-[#FECDD3]' },
  { label: 'PM2 Reload', cmd: 'pm2 reload all', bg: 'bg-[#BBF7D0]' },
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectPath, setProjectPath] = useState('');
  
  // Dual-mode pipeline commands: 'script' (multiline script) or 'steps' (step-by-step)
  const [commandMode, setCommandMode] = useState<'script' | 'steps'>('script');
  const [scriptText, setScriptText] = useState(DEFAULT_SCRIPT);
  const [steps, setSteps] = useState<PipelineStep[]>([
    { step_order: 1, name: 'Step 1', command: 'git pull origin main', working_dir: '', is_enabled: true, continue_on_error: false },
    { step_order: 2, name: 'Step 2', command: 'npm run build', working_dir: '', is_enabled: true, continue_on_error: false },
  ]);

  const [envRaw, setEnvRaw] = useState('');
  const [showEnv, setShowEnv] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when switching modes
  const handleSwitchToSteps = () => {
    if (scriptText.trim()) {
      const lines = scriptText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'));
      const newSteps: PipelineStep[] = lines.map((cmd, idx) => ({
        step_order: idx + 1,
        name: `Step ${idx + 1}`,
        command: cmd,
        working_dir: '',
        is_enabled: true,
        continue_on_error: false,
      }));
      setSteps(newSteps.length > 0 ? newSteps : [{ step_order: 1, name: 'Step 1', command: 'echo "Started"', working_dir: '', is_enabled: true, continue_on_error: false }]);
    }
    setCommandMode('steps');
  };

  const handleSwitchToScript = () => {
    if (steps.length > 0) {
      setScriptText(steps.map((s) => s.command).join('\n'));
    }
    setCommandMode('script');
  };

  const handleAddSnippet = (cmd: string) => {
    if (commandMode === 'script') {
      const separator = scriptText.trim().length > 0 ? '\n' : '';
      setScriptText((prev) => prev.trim() + separator + cmd);
    } else {
      setSteps((prev) => [
        ...prev,
        {
          step_order: prev.length + 1,
          name: `Step ${prev.length + 1}`,
          command: cmd,
          working_dir: '',
          is_enabled: true,
          continue_on_error: false,
        },
      ]);
    }
  };

  const handleAddStepItem = () => {
    setSteps((prev) => [
      ...prev,
      {
        step_order: prev.length + 1,
        name: `Step ${prev.length + 1}`,
        command: '',
        working_dir: '',
        is_enabled: true,
        continue_on_error: false,
      },
    ]);
  };

  const handleUpdateStepItem = (index: number, val: string) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], command: val };
    setSteps(updated);
  };

  const handleRemoveStepItem = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Project Name is required.');
      return;
    }

    if (!projectPath.trim()) {
      setError('Host Working Directory Path is required.');
      return;
    }

    // Build final steps based on active mode
    let finalSteps: PipelineStep[] = [];
    if (commandMode === 'script') {
      const lines = scriptText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'));
      finalSteps = lines.map((cmd, idx) => ({
        step_order: idx + 1,
        name: `Step ${idx + 1}`,
        command: cmd,
        working_dir: '',
        is_enabled: true,
        continue_on_error: false,
      }));
    } else {
      finalSteps = steps.filter((s) => s.command.trim().length > 0);
    }

    if (finalSteps.length === 0) {
      finalSteps = [
        {
          step_order: 1,
          name: 'Step 1',
          command: 'echo "Deployment completed"',
          working_dir: '',
          is_enabled: true,
          continue_on_error: false,
        },
      ];
    }

    // Parse envRaw
    const envVars: Record<string, string> = {};
    if (envRaw.trim()) {
      for (const line of envRaw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const k = trimmed.slice(0, eqIdx).trim();
          const v = trimmed.slice(eqIdx + 1).trim();
          if (k) envVars[k] = v;
        }
      }
    }

    setLoading(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        project_path: projectPath.trim(),
        env_vars: envVars,
        steps: finalSteps,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl bg-white border-2 border-black rounded-2xl sm:rounded-3xl shadow-[4px_4px_0px_#000000] sm:shadow-[8px_8px_0px_#000000] p-4 sm:p-7 relative animate-pop-in my-4 sm:my-8 text-black max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1.5 text-black hover:bg-zinc-100 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000000] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5 sm:mb-6 pb-4 border-b-2 border-black pr-8 sm:pr-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-black">
                <span>Create </span>
                <span className="highlight-yellow">New Project</span>
              </h2>
              <DoodleSparks className="w-5 h-5 sm:w-6 sm:h-6 inline-block" />
            </div>
            <p className="text-xs text-zinc-600 mt-1 font-medium">
              Connect a host directory, write your deployment script or steps, and launch your automated pipeline.
            </p>
          </div>

          <div className="hidden sm:block shrink-0">
            <CreateProjectBoxIllustration className="w-24 h-24" />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#FEE2E2] border-2 border-black text-[#B91C1C] text-xs font-bold shadow-[2px_2px_0px_#000000]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Project Name & Path */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-black mb-1.5">
                Project Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Website-Enhancer"
                className="neo-input"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-black mb-1.5">
                Host Working Directory Path <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <Folder className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  placeholder="e.g. E:\Website-Enhancer"
                  className="neo-input pl-9 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black text-black mb-1.5">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Customer portal frontend & API services"
              className="neo-input"
            />
          </div>

          {/* Pipeline Commands Section (Dual Mode: Script vs Step-by-Step) */}
          <div className="p-4 rounded-2xl bg-[#FAF7EE] border-2 border-black space-y-3 shadow-[2px_2px_0px_#000000]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-1 border-b border-black/10">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-black" />
                <div>
                  <h4 className="text-xs font-black text-black">Deployment Commands</h4>
                  <p className="text-[10px] text-zinc-600 font-medium">Commands execute sequentially when deploying.</p>
                </div>
              </div>

              {/* Mode Toggle Switch: Script vs Steps */}
              <div className="flex items-center border-2 border-black rounded-xl overflow-hidden bg-white shadow-[1.5px_1.5px_0px_#000000]">
                <button
                  type="button"
                  onClick={handleSwitchToScript}
                  className={`px-3 py-1 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer ${
                    commandMode === 'script'
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-zinc-100'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Script (multiline)</span>
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToSteps}
                  className={`px-3 py-1 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer ${
                    commandMode === 'steps'
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-zinc-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Step-by-Step</span>
                </button>
              </div>
            </div>

            {/* Quick Add Snippets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-extrabold text-black flex items-center gap-1 mr-1">
                <Zap className="w-3 h-3 text-[#FACC15] fill-[#FACC15]" /> Quick Add:
              </span>
              {QUICK_SNIPPETS.map((snip) => (
                <button
                  key={snip.label}
                  type="button"
                  onClick={() => handleAddSnippet(snip.cmd)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000] hover:translate-y-[-1px] transition-all cursor-pointer ${snip.bg}`}
                >
                  + {snip.label}
                </button>
              ))}
            </div>

            {/* MODE 1: SCRIPT (Multiline shell script textarea) */}
            {commandMode === 'script' ? (
              <div className="space-y-1.5 pt-1">
                <div className="bg-[#0C0D12] rounded-xl border-2 border-black p-3 shadow-[2px_2px_0px_#000000]">
                  <textarea
                    rows={5}
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    placeholder="git pull&#10;npm run build&#10;pm2 reload all"
                    className="w-full bg-transparent text-emerald-400 font-mono text-xs focus:outline-none placeholder:text-zinc-600 leading-relaxed"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 font-medium">
                  Tip: Each line executes sequentially as a pipeline step. Empty lines and lines starting with # are skipped.
                </p>
              </div>
            ) : (
              /* MODE 2: STEPS (Step-by-step inputs) */
              <div className="space-y-2 pt-1">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#FEF08A] border-2 border-black font-extrabold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div className="relative flex-1">
                      <span className="text-zinc-500 font-mono text-xs absolute left-3 top-1/2 -translate-y-1/2 select-none">$</span>
                      <input
                        type="text"
                        value={step.command}
                        onChange={(e) => handleUpdateStepItem(idx, e.target.value)}
                        placeholder="e.g. git pull"
                        className="neo-input pl-8 font-mono text-xs py-1.5"
                      />
                    </div>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStepItem(idx)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="Remove step"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddStepItem}
                  className="neo-btn-white w-full py-1.5 text-xs flex items-center justify-center gap-1 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Step
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Initial Environment Variables (.env) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowEnv(!showEnv)}
              className="text-xs font-black text-black flex items-center gap-1.5 hover:underline cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{showEnv ? 'Hide initial environment variables (.env)' : '+ Add initial environment variables (.env)'}</span>
            </button>

            {showEnv && (
              <div className="mt-2 p-3 rounded-2xl bg-[#0C0D12] border-2 border-black shadow-[2px_2px_0px_#000000]">
                <textarea
                  rows={4}
                  value={envRaw}
                  onChange={(e) => setEnvRaw(e.target.value)}
                  placeholder="KEY=value&#10;PORT=3000"
                  className="w-full bg-transparent text-emerald-400 font-mono text-xs focus:outline-none placeholder:text-zinc-600"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-black">
            <button
              type="button"
              onClick={onClose}
              className="neo-btn-white px-5 py-2 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="neo-btn-yellow px-6 py-2.5 text-xs flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Create Project</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
