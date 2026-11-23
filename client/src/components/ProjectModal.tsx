import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  Settings,
  Rocket,
  Shield,
  Layers,
  Save,
  HelpCircle,
  Folder,
  Trash2,
  Terminal,
  Zap,
  Plus,
  FileCode,
  Check,
  Globe,
  Bell,
  Sliders,
  ChevronRight,
  Edit2,
  Info
} from 'lucide-react';
import { Project, PipelineStep } from '../api';
import {
  GearLaptopIllustration,
  LaptopShieldIllustration,
  ProjectInfoTerminalBox,
  DoodleSparks
} from './Illustrations';

interface ProjectModalProps {
  project: Project;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    project_path: string;
    env_vars: Record<string, string>;
    steps: PipelineStep[];
    sudoPassword?: string;
  }) => Promise<void>;
  onNavigateEnv?: () => void;
  onDeleteProject?: (id: number) => void;
}

const QUICK_SNIPPETS = [
  { label: 'Git Pull', cmd: 'git pull origin main', bg: 'bg-[#BAE6FD]' },
  { label: 'NPM Build', cmd: 'npm run build', bg: 'bg-[#DDD6FE]' },
  { label: 'Docker Up', cmd: 'docker compose up -d --build', bg: 'bg-[#FECDD3]' },
  { label: 'PM2 Reload', cmd: 'pm2 reload all', bg: 'bg-[#BBF7D0]' },
];

export const ProjectModal: React.FC<ProjectModalProps> = ({
  project,
  onClose,
  onSave,
  onNavigateEnv,
  onDeleteProject,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'build' | 'domains' | 'access' | 'notifications' | 'danger'>('general');
  const [name, setName] = useState(project.name || '');
  const [description, setDescription] = useState(project.description || '');
  const [projectPath, setProjectPath] = useState(project.project_path || '');
  const [buildCommand, setBuildCommand] = useState('npm run build');
  const [outputDir, setOutputDir] = useState('dist');
  const [branch, setBranch] = useState('main');
  const [autoDeploy, setAutoDeploy] = useState(true);
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  // Dual-mode pipeline script vs steps
  const [commandMode, setCommandMode] = useState<'script' | 'steps'>('script');
  const [scriptText, setScriptText] = useState(
    project.steps && project.steps.length > 0
      ? project.steps.map((s) => s.command).join('\n')
      : 'git pull origin main\nnpm run build'
  );
  const [steps, setSteps] = useState<PipelineStep[]>(
    project.steps && project.steps.length > 0
      ? project.steps
      : [
          { step_order: 1, name: 'Step 1', command: 'git pull origin main', working_dir: '', is_enabled: true, continue_on_error: false },
          { step_order: 2, name: 'Step 2', command: 'npm run build', working_dir: '', is_enabled: true, continue_on_error: false },
        ]
  );

  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setProjectPath(project.project_path || '');
      if (project.steps && project.steps.length > 0) {
        setSteps(project.steps);
        setScriptText(project.steps.map((s) => s.command).join('\n'));
      }
    }
  }, [project]);

  // Sync mode toggling
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
      setSteps(newSteps.length > 0 ? newSteps : [{ step_order: 1, name: 'Step 1', command: 'echo "Ready"', working_dir: '', is_enabled: true, continue_on_error: false }]);
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

  const envCount = project.env_vars ? Object.keys(project.env_vars).length : 0;
  const envKeys = project.env_vars ? Object.keys(project.env_vars).slice(0, 4) : [];

  const handleSaveAll = async () => {
    setLoading(true);

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

    try {
      await onSave({
        name,
        description,
        project_path: projectPath,
        env_vars: project.env_vars || {},
        steps: finalSteps.length > 0 ? finalSteps : project.steps || [],
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 900);
    } catch (err: any) {
      alert(`Error saving project: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-5xl bg-[#FAF7EE] border-2 border-black rounded-2xl sm:rounded-3xl shadow-[4px_4px_0px_#000000] sm:shadow-[8px_8px_0px_#000000] p-4 sm:p-6 relative animate-pop-in my-3 sm:my-6 text-black max-h-[92vh] overflow-y-auto">
        {/* Top Header (Image 8) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b-2 border-black pr-8 sm:pr-0">
          <div className="space-y-1.5 min-w-0 max-w-full">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="neo-btn-white px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-black truncate">Project Settings</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#BFDBFE] text-blue-900 border border-black text-xs font-mono font-bold shrink-0">
                  {project.slug || project.name.toLowerCase()}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-600 font-medium pl-1 line-clamp-1 sm:line-clamp-none">
              Configure your project settings and deployment preferences.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 self-end sm:self-auto">
            <GearLaptopIllustration className="w-36 h-20 hidden md:block" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 p-1.5 rounded-lg border-2 border-black bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_#000000] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Horizontal Tabs: Full horizontal scrollable tabs on mobile, 4 main tabs on desktop */}
        <div className="flex items-center gap-2 py-3 border-b-2 border-black/10 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-xl font-extrabold text-xs border-2 border-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'general'
                ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_#000000]'
                : 'bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>General</span>
          </button>

          <button
            onClick={() => setActiveTab('build')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-xl font-extrabold text-xs border-2 border-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'build'
                ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_#000000]'
                : 'bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Build &amp; Deploy</span>
          </button>

          <button
            onClick={() => setActiveTab('domains')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-xl font-extrabold text-xs border-2 border-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'domains'
                ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_#000000]'
                : 'bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Domains &amp; SSL</span>
          </button>

          <button
            onClick={() => setActiveTab('access')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-xl font-extrabold text-xs border-2 border-black flex lg:hidden items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'access'
                ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_#000000]'
                : 'bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Access</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-xl font-extrabold text-xs border-2 border-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_#000000]'
                : 'bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Advanced</span>
          </button>

          <button
            onClick={() => setActiveTab('danger')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-xl font-extrabold text-xs border-2 border-black flex lg:hidden items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'danger'
                ? 'bg-[#FEE2E2] text-rose-700 shadow-[2px_2px_0px_#000000]'
                : 'bg-white text-rose-600 hover:bg-rose-50'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Danger</span>
          </button>
        </div>

        {/* Main Body: Left Sidebar (Desktop only) + Right Content Area (Image 8) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4 items-start">
          {/* Left Vertical Nav (Desktop only: lg:block) */}
          <div className="hidden lg:block lg:col-span-3 space-y-2">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full p-2.5 rounded-xl border-2 border-black font-extrabold text-xs flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_#000000]'
                  : 'bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span>General</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTab('build')}
              className={`w-full p-2.5 rounded-xl border-2 border-black font-extrabold text-xs flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'build'
                  ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_#000000]'
                  : 'bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4" />
                <span>Build &amp; Deploy</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('domains')}
              className={`w-full p-2.5 rounded-xl border-2 border-black font-extrabold text-xs flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'domains'
                  ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_#000000]'
                  : 'bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>Domains &amp; SSL</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('access')}
              className={`w-full p-2.5 rounded-xl border-2 border-black font-extrabold text-xs flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'access'
                  ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_#000000]'
                  : 'bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Access Control</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full p-2.5 rounded-xl border-2 border-black font-extrabold text-xs flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_#000000]'
                  : 'bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('danger')}
              className={`w-full p-2.5 rounded-xl border-2 border-black font-extrabold text-xs flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'danger'
                  ? 'bg-[#FEE2E2] text-rose-700 shadow-[2px_2px_0px_#000000]'
                  : 'bg-white text-rose-600 hover:bg-rose-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>Danger Zone</span>
              </div>
            </button>
          </div>

          {/* Right Main Section (Image 8) */}
          <div className="lg:col-span-9 space-y-4">
            {/* VIEW 1: GENERAL (Image 8 - 4 Cards Grid) */}
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Project Information */}
                <div className="neo-box p-5 bg-white space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-black" />
                        <h4 className="text-xs font-black text-black">Project Information</h4>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                        Basic information about your project.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditingInfo(!isEditingInfo)}
                      className="neo-btn-white px-2.5 py-1 text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{isEditingInfo ? 'Done' : 'Edit'}</span>
                    </button>
                  </div>

                  <div className="flex items-start gap-3 sm:gap-4 pt-1">
                    <ProjectInfoTerminalBox className="w-12 h-12 sm:w-16 sm:h-16 shrink-0" />

                    <div className="space-y-2 flex-1 min-w-0">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">Project Name</p>
                        {isEditingInfo ? (
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="neo-input text-xs py-1 mt-0.5"
                          />
                        ) : (
                          <p className="font-extrabold text-sm text-black truncate">{name}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">Project Description</p>
                        {isEditingInfo ? (
                          <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="neo-input text-xs py-1 mt-0.5"
                          />
                        ) : (
                          <p className="text-xs text-zinc-600 line-clamp-2">
                            {description || 'Application for managing pipeline and deployments.'}
                          </p>
                        )}
                      </div>

                      {isEditingInfo && (
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase">Host Working Directory</p>
                          <input
                            type="text"
                            value={projectPath}
                            onChange={(e) => setProjectPath(e.target.value)}
                            className="neo-input text-xs font-mono py-1 mt-0.5"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card 2: Deployment Settings */}
                <div className="neo-box p-5 bg-white space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-black" />
                      <h4 className="text-xs font-black text-black">Deployment Settings</h4>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                      Configure how this project is deployed.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-black text-black">Auto Deploy</p>
                        <p className="text-[11px] text-zinc-500">Automatically deploy on every successful push.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoDeploy(!autoDeploy)}
                        className={`w-11 h-6 rounded-full border-2 border-black transition-colors relative cursor-pointer shrink-0 ${
                          autoDeploy ? 'bg-[#7C3AED]' : 'bg-zinc-200'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full bg-white border border-black absolute top-0.5 transition-all ${
                            autoDeploy ? 'right-0.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    <div>
                      <p className="text-xs font-black text-black mb-1">Branch to Deploy</p>
                      <p className="text-[11px] text-zinc-500 mb-1.5">Select the branch to deploy.</p>
                      <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="neo-input font-mono text-xs cursor-pointer py-1.5"
                      >
                        <option value="main">main</option>
                        <option value="master">master</option>
                        <option value="production">production</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Card 3: Build Settings */}
                <div className="neo-box p-5 bg-white space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-black" />
                      <h4 className="text-xs font-black text-black">Build Settings</h4>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                      Customize build configuration for your project.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-xs font-black text-black flex items-center gap-1 mb-1">
                        <span>Build Command</span>
                        <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                      </label>
                      <input
                        type="text"
                        value={buildCommand}
                        onChange={(e) => setBuildCommand(e.target.value)}
                        className="neo-input font-mono text-xs py-1.5"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-black flex items-center gap-1 mb-1">
                        <span>Output Directory</span>
                        <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                      </label>
                      <input
                        type="text"
                        value={outputDir}
                        onChange={(e) => setOutputDir(e.target.value)}
                        className="neo-input font-mono text-xs py-1.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 4: Environment */}
                <div className="neo-box p-5 bg-white flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between pb-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-black" />
                          <h4 className="text-xs font-black text-black">Environment</h4>
                        </div>
                        <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                          Manage environment settings for this project.
                        </p>
                      </div>

                      {onNavigateEnv && (
                        <button
                          type="button"
                          onClick={onNavigateEnv}
                          className="px-2.5 py-1 rounded-lg bg-[#EDE9FE] text-purple-900 border border-black font-extrabold text-[10px] flex items-center gap-1 hover:bg-[#DDD6FE] cursor-pointer shrink-0"
                        >
                          <span>Manage Variables</span>
                          <span>&rarr;</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-zinc-700 font-bold my-2">
                      <Info className="w-3.5 h-3.5 text-blue-600" />
                      <span>{envCount} environment variables configured</span>
                      <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                    </div>

                    {envKeys.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {envKeys.map((k, i) => (
                          <span
                            key={k}
                            className={`px-2.5 py-0.5 rounded-full border border-black font-mono text-[11px] font-bold ${
                              i % 2 === 0 ? 'bg-[#EDE9FE] text-purple-900' : 'bg-[#DCFCE7] text-emerald-900'
                            }`}
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">No variables configured yet.</p>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <LaptopShieldIllustration className="w-24 h-16" />
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: BUILD & DEPLOY (Dual-Mode Script vs Steps) */}
            {activeTab === 'build' && (
              <div className="space-y-4">
                {/* Pipeline Script / Steps Card */}
                <div className="neo-box p-5 bg-white space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b-2 border-black/10">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-black" />
                      <div>
                        <h4 className="text-xs font-black text-black">Pipeline Execution Sequence</h4>
                        <p className="text-[10px] text-zinc-500 font-medium">Commands executed sequentially on each deployment run.</p>
                      </div>
                    </div>

                    {/* Mode Toggle: Script vs Step-by-Step */}
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

                  {/* MODE 1: SCRIPT (Multiline script textarea) */}
                  {commandMode === 'script' ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="bg-[#0C0D12] rounded-xl border-2 border-black p-3.5 shadow-[2px_2px_0px_#000000]">
                        <textarea
                          rows={6}
                          value={scriptText}
                          onChange={(e) => setScriptText(e.target.value)}
                          placeholder="git pull&#10;npm run build&#10;pm2 reload all"
                          className="w-full bg-transparent text-emerald-400 font-mono text-xs focus:outline-none placeholder:text-zinc-600 leading-relaxed"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-500 font-medium">
                        Each line runs sequentially as a step. If any command fails, execution stops immediately.
                      </p>
                    </div>
                  ) : (
                    /* MODE 2: STEPS (Step-by-step sequential inputs) */
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
                              placeholder="e.g. npm run build"
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
              </div>
            )}

            {/* VIEW 3: DOMAINS & SSL */}
            {activeTab === 'domains' && (
              <div className="neo-box p-5 bg-white space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-black/10">
                  <Globe className="w-4 h-4 text-black" />
                  <h4 className="text-xs font-black text-black">Domains &amp; SSL Routing</h4>
                </div>
                <p className="text-xs text-zinc-600">
                  Configure custom domain routing, reverse proxy targets, and automatic TLS certificates.
                </p>
                <div className="p-4 rounded-xl bg-[#FAF7EE] border-2 border-black text-xs font-mono">
                  Default domain: <strong>{project.slug || project.name.toLowerCase()}.varex.local</strong>
                </div>
              </div>
            )}

            {/* VIEW 4: ACCESS CONTROL */}
            {activeTab === 'access' && (
              <div className="neo-box p-5 bg-white space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-black/10">
                  <Shield className="w-4 h-4 text-black" />
                  <h4 className="text-xs font-black text-black">Access Control &amp; Permissions</h4>
                </div>
                <p className="text-xs text-zinc-600">
                  Manage deployment authorization requirements and access level for this application.
                </p>
                <div className="p-4 rounded-xl bg-[#EFF6FF] border-2 border-black text-xs font-medium">
                  Currently, Main Administrators have full write/deploy permissions. Sub Admins can trigger deployment runs.
                </div>
              </div>
            )}

            {/* VIEW 5: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="neo-box p-5 bg-white space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-black/10">
                  <Bell className="w-4 h-4 text-black" />
                  <h4 className="text-xs font-black text-black">Deployment Notifications</h4>
                </div>
                <p className="text-xs text-zinc-600">
                  Send webhook notifications to Slack, Discord, or custom endpoints upon deployment events.
                </p>
                <div className="p-4 rounded-xl bg-[#FAF7EE] border-2 border-black text-xs text-zinc-500 font-medium">
                  No active webhooks configured.
                </div>
              </div>
            )}

            {/* VIEW 6: DANGER ZONE */}
            {activeTab === 'danger' && (
              <div className="neo-box p-5 bg-white border-rose-600 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-rose-200 text-rose-700">
                  <Trash2 className="w-4 h-4" />
                  <h4 className="text-xs font-black">Danger Zone</h4>
                </div>
                <p className="text-xs text-zinc-600">
                  Permanently delete this project, all pipeline history, and configuration files. This action cannot be undone.
                </p>
                {onDeleteProject && (
                  <button
                    type="button"
                    onClick={() => onDeleteProject(project.id)}
                    className="neo-btn-danger px-4 py-2 text-xs flex items-center gap-2 font-black cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Project Permanently</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Right Save Changes Button (Image 8) */}
        <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t-2 border-black">
          <button
            type="button"
            onClick={onClose}
            className="neo-btn-white px-5 py-2.5 text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={loading}
            className="neo-btn-yellow px-6 py-2.5 text-xs flex items-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000]"
          >
            <Save className="w-4 h-4" />
            <span>{savedSuccess ? 'Changes Saved!' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
