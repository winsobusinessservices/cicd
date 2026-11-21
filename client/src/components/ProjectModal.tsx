import React, { useState } from 'react';
import {
  X,
  Folder,
  Layers,
  Terminal,
  Check,
  Plus,
  Trash2,
  Code2,
  ListOrdered,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Project, PipelineStep } from '../api';

interface ProjectModalProps {
  project?: Project | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    project_path: string;
    env_vars: Record<string, string>;
    steps: PipelineStep[];
  }) => Promise<void>;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose, onSave }) => {
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [projectPath, setProjectPath] = useState(project?.project_path || '');
  const [envText, setEnvText] = useState(
    project?.env_vars ? Object.entries(project.env_vars).map(([k, v]) => `${k}=${v}`).join('\n') : ''
  );
  const [showEnvSection, setShowEnvSection] = useState(false);

  // Command input mode: 'script' (multiline commands) or 'steps' (structured step list)
  const [commandMode, setCommandMode] = useState<'script' | 'steps'>('script');

  // Script text representation (each line is a command)
  const [scriptText, setScriptText] = useState<string>(
    project?.steps && project.steps.length > 0
      ? project.steps.map((s) => s.command).join('\n')
      : ''
  );

  // Structured steps
  const [steps, setSteps] = useState<PipelineStep[]>(
    project?.steps && project.steps.length > 0
      ? project.steps
      : []
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync scriptText to steps when switching modes
  const handleSwitchToSteps = () => {
    if (scriptText.trim()) {
      const lines = scriptText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('#'));
      const newSteps: PipelineStep[] = lines.map((cmd, i) => ({
        step_order: i + 1,
        name: `Step ${i + 1}`,
        command: cmd,
        working_dir: '',
        is_enabled: true,
        continue_on_error: false,
      }));
      setSteps(newSteps);
    }
    setCommandMode('steps');
  };

  // Sync steps to scriptText when switching modes
  const handleSwitchToScript = () => {
    if (steps.length > 0) {
      setScriptText(steps.map((s) => s.command).join('\n'));
    }
    setCommandMode('script');
  };

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        step_order: steps.length + 1,
        name: `Step ${steps.length + 1}`,
        command: '',
        working_dir: '',
        is_enabled: true,
        continue_on_error: false,
      },
    ]);
  };

  const handleUpdateStep = (index: number, patch: Partial<PipelineStep>) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], ...patch };
    setSteps(updated);
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !projectPath.trim()) {
      setError('Project Name and Working Directory Path are required.');
      return;
    }

    // Build final steps based on active mode
    let finalSteps: PipelineStep[] = [];
    if (commandMode === 'script') {
      const lines = scriptText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'));

      finalSteps = lines.map((cmd, i) => ({
        step_order: i + 1,
        name: `Step ${i + 1}`,
        command: cmd,
        working_dir: '',
        is_enabled: true,
        continue_on_error: false,
      }));
    } else {
      finalSteps = steps.filter((s) => s.command.trim().length > 0);
    }

    // Parse env variables
    const envVars: Record<string, string> = {};
    if (envText.trim()) {
      const lines = envText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim();
          if (key) envVars[key] = val;
        }
      }
    }

    setLoading(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        project_path: projectPath.trim(),
        env_vars: envVars,
        steps: finalSteps,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-100">
              {project ? 'Edit Project & Deployment Commands' : 'Add New Project & Deployment Steps'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Project Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Website, API Service, Auth Engine"
              className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              required
            />
          </div>

          {/* Project Working Directory */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Project Working Directory (Host Server Path) *
            </label>
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                placeholder="e.g. /var/www/my-site or D:\projects\my-app"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              The server directory where your commands will be executed.
            </p>
          </div>

          {/* Deployment Commands Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Deployment Commands (Codes to Perform)
                </label>
                <p className="text-[11px] text-slate-400">
                  Enter the exact commands to execute when deploying this project. No default commands forced.
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={handleSwitchToScript}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                    commandMode === 'script'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" /> Script (Lines)
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToSteps}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                    commandMode === 'steps'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" /> Step by Step
                </button>
              </div>
            </div>

            {/* Script Text Mode (Enter commands line-by-line) */}
            {commandMode === 'script' ? (
              <div className="space-y-1.5">
                <textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder={`# Enter your deployment commands line by line:\ncd app\ngit pull origin main\ndocker build -t myapp .\ndocker run -d -p 3000:3000 myapp`}
                  rows={6}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070a12] border border-slate-800 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors leading-relaxed"
                />
                <p className="text-[10px] text-slate-500 font-mono">
                  Each non-empty line runs as an isolated step in sequence.
                </p>
              </div>
            ) : (
              /* Structured Step-by-Step Mode */
              <div className="space-y-2.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                {steps.map((st, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 text-center font-mono text-xs text-slate-500 select-none">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={st.command}
                      onChange={(e) => handleUpdateStep(idx, { command: e.target.value })}
                      placeholder="e.g. docker compose up -d"
                      className="flex-1 bg-[#070a12] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddStep}
                  className="w-full py-1.5 border border-dashed border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Command Line
                </button>
              </div>
            )}
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of application purpose"
              className="w-full px-3.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Collapsible Environment Variables */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
            <button
              type="button"
              onClick={() => setShowEnvSection(!showEnvSection)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:bg-slate-800/40 transition-colors"
            >
              <span>Environment Variables / Secrets (Optional)</span>
              {showEnvSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showEnvSection && (
              <div className="p-4 border-t border-slate-800">
                <textarea
                  value={envText}
                  onChange={(e) => setEnvText(e.target.value)}
                  placeholder="PORT=8080&#10;NODE_ENV=production&#10;DATABASE_URL=postgres://..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Saving...' : project ? 'Save Project Changes' : 'Create Project with Steps'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
