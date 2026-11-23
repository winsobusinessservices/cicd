import React, { useState } from 'react';
import {
  Layers,
  ArrowUp,
  ArrowDown,
  Trash2,
  Copy,
  Check,
  Folder,
  Zap,
  Save,
  HelpCircle,
  MoreHorizontal
} from 'lucide-react';
import { PipelineStep } from '../api';
import { DoodleSparks } from './Illustrations';

interface StepEditorProps {
  steps: PipelineStep[];
  onSave: (steps: PipelineStep[]) => Promise<void>;
  loading?: boolean;
  readOnly?: boolean;
}

const STEP_COLORS = [
  'bg-[#FEF08A] text-black', // yellow
  'bg-[#BAE6FD] text-black', // blue
  'bg-[#E9D5FF] text-black', // purple
  'bg-[#FBCFE8] text-black', // pink
  'bg-[#BBF7D0] text-black', // green
];

const QUICK_SNIPPETS = [
  { label: 'Git Pull', cmd: 'git pull origin main', bg: 'bg-[#BAE6FD]' },
  { label: 'NPM Build', cmd: 'npm run build', bg: 'bg-[#DDD6FE]' },
  { label: 'Docker Up', cmd: 'docker compose up -d --build', bg: 'bg-[#FECDD3]' },
  { label: 'PM2 Reload', cmd: 'pm2 reload all', bg: 'bg-[#BBF7D0]' },
];

export const StepEditor: React.FC<StepEditorProps> = ({
  steps: initialSteps,
  onSave,
  loading,
  readOnly = false,
}) => {
  const [steps, setSteps] = useState<PipelineStep[]>(
    initialSteps.length > 0
      ? initialSteps
      : [
          {
            name: 'Step 1',
            command: 'git pull',
            working_dir: '',
            is_enabled: true,
            continue_on_error: false,
          },
        ]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const selectedStep = steps[selectedIndex] || steps[0];

  const updateSelectedStep = (patch: Partial<PipelineStep>) => {
    if (readOnly || !selectedStep) return;
    const updated = [...steps];
    updated[selectedIndex] = { ...updated[selectedIndex], ...patch };
    setSteps(updated);
    setHasChanges(true);
    setSavedSuccess(false);
  };

  const addStep = (command = 'echo "New step"') => {
    if (readOnly) return;
    const newStep: PipelineStep = {
      name: `Step ${steps.length + 1}`,
      command,
      working_dir: '',
      is_enabled: true,
      continue_on_error: false,
    };
    const nextSteps = [...steps, newStep];
    setSteps(nextSteps);
    setSelectedIndex(nextSteps.length - 1);
    setHasChanges(true);
    setSavedSuccess(false);
  };

  const removeStep = (index: number) => {
    if (readOnly || steps.length <= 1) return;
    const nextSteps = steps.filter((_, i) => i !== index);
    setSteps(nextSteps);
    setSelectedIndex(Math.max(0, index - 1));
    setHasChanges(true);
    setSavedSuccess(false);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (readOnly) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const nextSteps = [...steps];
    const [moved] = nextSteps.splice(index, 1);
    nextSteps.splice(targetIndex, 0, moved);
    setSteps(nextSteps);
    setSelectedIndex(targetIndex);
    setHasChanges(true);
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    if (readOnly) return;
    await onSave(steps);
    setHasChanges(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const copyCommand = () => {
    if (selectedStep) {
      navigator.clipboard.writeText(selectedStep.command);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 1500);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* LEFT COLUMN: Execution Pipeline Sequence */}
      <div className="lg:col-span-4 neo-box p-4 bg-white space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FAF7EE] border-2 border-black flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-black" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-black">Execution Pipeline Sequence</h3>
            <p className="text-[11px] text-zinc-600 leading-snug mt-0.5">
              Commands execute sequentially. If any step fails, execution halts immediately.
            </p>
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-2 pt-1">
          {steps.map((step, idx) => {
            const isSelected = idx === selectedIndex;
            const badgeColor = STEP_COLORS[idx % STEP_COLORS.length];

            return (
              <div
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`p-2.5 rounded-xl border-2 border-black flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#FEF08A] shadow-[3px_3px_0px_#000000]'
                    : 'bg-white hover:bg-zinc-50 shadow-[2px_2px_0px_#000000]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-zinc-400 font-mono text-xs select-none">:::</span>
                  <div
                    className={`w-6 h-6 rounded-md border-2 border-black font-extrabold text-xs flex items-center justify-center shrink-0 ${badgeColor}`}
                  >
                    {idx + 1}
                  </div>
                  <span className="font-mono text-xs font-bold text-black truncate">
                    {step.command || `Step ${idx + 1}`}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIndex(idx);
                    }}
                    className="p-1 hover:bg-black/10 rounded-md text-zinc-700"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Step Button */}
        {!readOnly && (
          <button
            type="button"
            onClick={() => addStep()}
            className="w-full py-2.5 rounded-xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-black font-extrabold text-xs border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center justify-center gap-1.5 transition-all active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
          >
            <span>+ Add Step</span>
          </button>
        )}
      </div>

      {/* RIGHT COLUMN: Configure Pipeline Step */}
      <div className="lg:col-span-8 neo-box p-6 bg-white space-y-5">
        {selectedStep ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-[#E9D5FF] text-black font-extrabold text-xs border-2 border-black">
                  Step {selectedIndex + 1}
                </span>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-extrabold text-black">Configure Pipeline Step</h3>
                  <DoodleSparks className="w-5 h-5" />
                </div>
              </div>

              {!readOnly && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={selectedIndex === 0}
                    onClick={() => moveStep(selectedIndex, 'up')}
                    className="p-1.5 rounded-lg border-2 border-black bg-white hover:bg-zinc-50 shadow-[2px_2px_0px_#000000] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move Step Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={selectedIndex === steps.length - 1}
                    onClick={() => moveStep(selectedIndex, 'down')}
                    className="p-1.5 rounded-lg border-2 border-black bg-white hover:bg-zinc-50 shadow-[2px_2px_0px_#000000] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move Step Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={steps.length <= 1}
                    onClick={() => removeStep(selectedIndex)}
                    className="p-1.5 rounded-lg border-2 border-black bg-[#FFE4E6] text-rose-700 hover:bg-rose-200 shadow-[2px_2px_0px_#000000] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Delete Step"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Form Fields Inner Container (Image 4) */}
            <div className="p-5 rounded-2xl bg-[#FAF7EE] border-2 border-black space-y-4 shadow-[2px_2px_0px_#000000]">
              {/* Command Input Box with Terminal Shell Look */}
              <div>
                <label className="block text-xs font-black text-black mb-1.5">
                  Command <span className="text-rose-600">*</span>
                </label>
                <div className="bg-[#0C0D12] text-white rounded-xl border-2 border-black p-3 flex items-center justify-between gap-3 shadow-[2px_2px_0px_#000000]">
                  <div className="flex items-center gap-2 font-mono text-xs flex-1 min-w-0">
                    <span className="text-zinc-500 font-bold select-none">$</span>
                    <input
                      type="text"
                      value={selectedStep.command}
                      onChange={(e) => updateSelectedStep({ command: e.target.value })}
                      readOnly={readOnly}
                      placeholder='e.g. cd "E:\Website-Enhancer"'
                      className="bg-transparent text-emerald-400 font-mono text-xs w-full focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={copyCommand}
                    className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
                    title="Copy command"
                  >
                    {copiedCmd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Subdirectory & Continue on Error row */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-black">
                  Subdirectory (optional)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Folder className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={selectedStep.working_dir || ''}
                      onChange={(e) => updateSelectedStep({ working_dir: e.target.value })}
                      readOnly={readOnly}
                      placeholder="relative (optional)"
                      className="neo-input pl-9 font-mono text-xs py-2 bg-white"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 sm:pl-2">
                    <input
                      type="checkbox"
                      checked={selectedStep.continue_on_error}
                      onChange={(e) => updateSelectedStep({ continue_on_error: e.target.checked })}
                      disabled={readOnly}
                      className="w-4 h-4 rounded border-2 border-black text-[#FACC15] focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-black flex items-center gap-1">
                      Continue on error
                      <HelpCircle className="w-3.5 h-3.5 text-zinc-400" title="Do not halt if this step exits with non-zero code" />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Quick Add Snippets Row (Image 4) */}
            {!readOnly && (
              <div className="p-3.5 rounded-2xl bg-[#FAF7EE] border-2 border-black flex flex-wrap items-center gap-2 shadow-[2px_2px_0px_#000000]">
                <span className="text-xs font-extrabold text-black flex items-center gap-1.5 mr-1">
                  <Zap className="w-4 h-4 text-[#FACC15] fill-[#FACC15]" /> Quick Add
                </span>
                {QUICK_SNIPPETS.map((snip) => (
                  <button
                    key={snip.label}
                    type="button"
                    onClick={() => addStep(snip.cmd)}
                    className={`px-3 py-1 rounded-full text-xs font-extrabold text-black border-2 border-black shadow-[2px_2px_0px_#000000] hover:translate-y-[-1px] transition-all cursor-pointer ${snip.bg}`}
                  >
                    + {snip.label}
                  </button>
                ))}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-black">
              <button
                type="button"
                onClick={() => setSteps(initialSteps)}
                className="neo-btn-white px-5 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="neo-btn-yellow px-6 py-2.5 text-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{savedSuccess ? 'Pipeline Saved!' : 'Save Pipeline'}</span>
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-zinc-500 font-bold">
            No pipeline step selected. Click "+ Add Step" to begin.
          </div>
        )}
      </div>
    </div>
  );
};
