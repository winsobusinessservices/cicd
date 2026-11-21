import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Check,
  Terminal,
  FolderOpen,
  HelpCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { PipelineStep } from '../api';

interface StepEditorProps {
  steps: PipelineStep[];
  onSave: (steps: PipelineStep[]) => Promise<void>;
  loading?: boolean;
}

export const StepEditor: React.FC<StepEditorProps> = ({ steps: initialSteps, onSave, loading }) => {
  const [steps, setSteps] = useState<PipelineStep[]>(initialSteps);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const updateStep = (index: number, patch: Partial<PipelineStep>) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], ...patch };
    setSteps(updated);
    setHasChanges(true);
    setSavedSuccess(false);
  };

  const addStep = (name = 'New Step', command = '') => {
    const newStep: PipelineStep = {
      name,
      command,
      working_dir: '',
      is_enabled: true,
      continue_on_error: false,
    };
    setSteps([...steps, newStep]);
    setHasChanges(true);
    setSavedSuccess(false);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index);
    setSteps(updated);
    setHasChanges(true);
    setSavedSuccess(false);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    const updated = [...steps];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSteps(updated);
    setHasChanges(true);
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    await onSave(steps);
    setHasChanges(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const addPreset = (name: string, command: string) => {
    addStep(name, command);
  };

  return (
    <div className="space-y-4">
      {/* Header and Quick Presets */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            CI/CD Pipeline Sequence
          </h3>
          <p className="text-xs text-slate-400">
            Sequential shell commands executed on deployment. If any step fails, execution halts immediately.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={loading || !hasChanges}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all ${
              savedSuccess
                ? 'bg-emerald-600 text-white'
                : hasChanges
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {savedSuccess ? 'Saved to DB!' : 'Save Sequence'}
          </button>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" /> Add Preset:
        </span>
        <button
          type="button"
          onClick={() => addPreset('Git Pull', 'git pull origin main')}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          + Git Pull
        </button>
        <button
          type="button"
          onClick={() => addPreset('NPM Build', 'npm install && npm run build')}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          + NPM Build
        </button>
        <button
          type="button"
          onClick={() => addPreset('Docker Build', 'docker build -t app:latest .')}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          + Docker Build
        </button>
        <button
          type="button"
          onClick={() => addPreset('Docker Compose Up', 'docker compose up -d --build')}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          + Docker Compose
        </button>
        <button
          type="button"
          onClick={() => addPreset('PM2 Reload', 'pm2 reload all || pm2 start dist/index.js')}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          + PM2 Reload
        </button>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`p-3.5 rounded-xl border transition-all ${
              step.is_enabled
                ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                : 'bg-slate-950/40 border-slate-800/40 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2 flex-1">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-800 text-cyan-400 font-mono text-xs font-bold border border-slate-700">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={step.name}
                  onChange={(e) => updateStep(index, { name: e.target.value })}
                  placeholder="Step Name (e.g. Docker Build)"
                  className="bg-transparent font-medium text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-1.5 py-0.5 w-full max-w-xs"
                />
              </div>

              {/* Step Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateStep(index, { is_enabled: !step.is_enabled })}
                  title={step.is_enabled ? 'Disable Step' : 'Enable Step'}
                  className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {step.is_enabled ? (
                    <ToggleRight className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-600" />
                  )}
                </button>

                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveStep(index, 'up')}
                  title="Move Up"
                  className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={index === steps.length - 1}
                  onClick={() => moveStep(index, 'down')}
                  title="Move Down"
                  className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  title="Remove Step"
                  className="p-1 rounded text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Command Input Area */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-mono text-xs select-none">$</span>
                <input
                  type="text"
                  value={step.command}
                  onChange={(e) => updateStep(index, { command: e.target.value })}
                  placeholder="e.g. docker compose up -d --build"
                  className="w-full bg-[#070a12] border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Working Dir and Continue on Error toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                  <span>Subdir (optional):</span>
                  <input
                    type="text"
                    value={step.working_dir || ''}
                    onChange={(e) => updateStep(index, { working_dir: e.target.value })}
                    placeholder="relative (e.g. client or backend)"
                    className="bg-[#070a12] border border-slate-800 rounded px-2 py-0.5 text-slate-300 text-xs w-48 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={step.continue_on_error}
                    onChange={(e) => updateStep(index, { continue_on_error: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Continue pipeline if this step fails</span>
                </label>
              </div>
            </div>
          </div>
        ))}

        {steps.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl">
            <p className="text-slate-400 text-sm mb-3">No steps defined yet for this deployment pipeline.</p>
            <button
              onClick={() => addStep('Initial Step', 'echo "Starting deploy..."')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
            >
              Add First Step
            </button>
          </div>
        )}
      </div>

      {/* Add Step Button */}
      <button
        type="button"
        onClick={() => addStep(`Step ${steps.length + 1}`, '')}
        className="w-full py-2.5 rounded-xl border border-dashed border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-500/5 text-slate-400 hover:text-cyan-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
      >
        <Plus className="w-4 h-4" /> Add Next Pipeline Step
      </button>
    </div>
  );
};
