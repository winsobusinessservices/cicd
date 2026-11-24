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
  Info,
  Boxes,
  Copy,
  RotateCcw,
  Key,
  Clock
} from 'lucide-react';
import { Project, PipelineStep, WebhookEvent, api } from '../api';
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
    env_vars?: Record<string, string>;
    steps: PipelineStep[];
    webhook_secret?: string;
    webhook_branch?: string;
    webhook_enabled?: boolean;
    schedule_cron?: string;
    schedule_enabled?: boolean;
    sudoPassword?: string;
  }) => Promise<void>;
  onNavigateEnv?: () => void;
  onNavigateServices?: () => void;
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
  onNavigateServices,
  onDeleteProject,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'build' | 'webhooks' | 'notifications' | 'danger'>('general');
  const [name, setName] = useState(project.name || '');
  const [description, setDescription] = useState(project.description || '');
  const [projectPath, setProjectPath] = useState(project.project_path || '');

  // Webhooks & Automation State
  const [webhookEnabled, setWebhookEnabled] = useState(Boolean(project.webhook_enabled));
  const [webhookBranch, setWebhookBranch] = useState(project.webhook_branch || 'main');
  const [webhookSecret, setWebhookSecret] = useState(project.webhook_secret || '');
  const [scheduleEnabled, setScheduleEnabled] = useState(Boolean(project.schedule_enabled));
  const [scheduleCron, setScheduleCron] = useState(project.schedule_cron || '');
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedWebhookSecret, setCopiedWebhookSecret] = useState(false);
  const [generatingSecret, setGeneratingSecret] = useState(false);

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
      setWebhookEnabled(Boolean(project.webhook_enabled));
      setWebhookBranch(project.webhook_branch || 'main');
      setWebhookSecret(project.webhook_secret || '');
      setScheduleEnabled(Boolean(project.schedule_enabled));
      setScheduleCron(project.schedule_cron || '');
    }
  }, [project]);

  useEffect(() => {
    if (activeTab === 'webhooks' && project?.id) {
      api.getWebhookHistory(project.id).then(setWebhookEvents).catch(() => {});
    }
  }, [activeTab, project?.id]);

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
        steps: finalSteps.length > 0 ? finalSteps : project.steps || [],
        webhook_secret: webhookSecret,
        webhook_branch: webhookBranch,
        webhook_enabled: webhookEnabled,
        schedule_cron: scheduleCron,
        schedule_enabled: scheduleEnabled,
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
            onClick={() => setActiveTab('webhooks')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-xl font-extrabold text-xs border-2 border-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'webhooks'
                ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_#000000]'
                : 'bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Webhooks &amp; Cron</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-xl font-extrabold text-xs border-2 border-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_#000000]'
                : 'bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
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
              onClick={() => setActiveTab('webhooks')}
              className={`w-full p-2.5 rounded-xl border-2 border-black font-extrabold text-xs flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'webhooks'
                  ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_#000000]'
                  : 'bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Webhooks &amp; Cron</span>
              </div>
              <ChevronRight className="w-4 h-4" />
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
            {/* VIEW 1: GENERAL */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                {/* Main Card: Project Details & Configuration */}
                <div className="neo-box p-5 bg-white space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b-2 border-black/10">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-black" />
                      <div>
                        <h4 className="text-sm font-black text-black">Project Details &amp; Configuration</h4>
                        <p className="text-xs text-zinc-500 font-medium">
                          Core application properties and server directory path.
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#BFDBFE] text-blue-900 border border-black font-mono font-bold text-xs">
                      Slug: {project.slug || project.name.toLowerCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Project Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-black text-black uppercase tracking-wider">
                        Project Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Todayfix"
                        className="neo-input font-bold text-xs py-2"
                      />
                    </div>

                    {/* Host Working Directory */}
                    <div className="space-y-1">
                      <label className="text-xs font-black text-black uppercase tracking-wider flex items-center justify-between">
                        <span>Host Working Directory</span>
                        <span className="text-[10px] text-zinc-500 font-normal">Server path</span>
                      </label>
                      <input
                        type="text"
                        value={projectPath}
                        onChange={(e) => setProjectPath(e.target.value)}
                        placeholder="e.g. /var/www/todayfix"
                        className="neo-input font-mono text-xs py-2"
                      />
                    </div>
                  </div>

                  {/* Project Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-black uppercase tracking-wider">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Production web application and API service"
                      className="neo-input text-xs py-2"
                    />
                  </div>
                </div>

                {/* Grid with 3 Connected Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card A: Webhooks & Cron Summary */}
                  <div className="neo-box p-4 bg-white flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-black text-xs text-black">
                          <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span>Automation</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-black ${
                            webhookEnabled || scheduleEnabled
                              ? 'bg-[#DCFCE7] text-emerald-800'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          {webhookEnabled || scheduleEnabled ? 'ACTIVE' : 'IDLE'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-600 space-y-1">
                        <p className="flex items-center justify-between">
                          <span className="font-bold">Webhook:</span>
                          <span className="font-mono text-[11px] truncate max-w-[120px]">{webhookEnabled ? `branch: ${webhookBranch}` : 'Disabled'}</span>
                        </p>
                        <p className="flex items-center justify-between">
                          <span className="font-bold">Schedule:</span>
                          <span className="font-mono text-[11px] truncate max-w-[120px]">{scheduleEnabled ? scheduleCron : 'None'}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('webhooks')}
                      className="neo-btn-white w-full py-1.5 text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Configure Webhooks</span>
                      <span>&rarr;</span>
                    </button>
                  </div>

                  {/* Card B: Environment Variables Summary */}
                  <div className="neo-box p-4 bg-white flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-black text-xs text-black">
                          <Globe className="w-4 h-4 text-blue-600" />
                          <span>Environment</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-black bg-[#EDE9FE] text-purple-900">
                          {envCount} VARS
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 font-medium line-clamp-2">
                        {envKeys.length > 0 ? envKeys.join(', ') : 'No environment variables set.'}
                      </p>
                    </div>

                    {onNavigateEnv && (
                      <button
                        type="button"
                        onClick={onNavigateEnv}
                        className="neo-btn-white w-full py-1.5 text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Manage Variables</span>
                        <span>&rarr;</span>
                      </button>
                    )}
                  </div>

                  {/* Card C: Multi-Container Services Summary */}
                  <div className="neo-box p-4 bg-white flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-black text-xs text-black">
                          <Boxes className="w-4 h-4 text-emerald-600" />
                          <span>Containers</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-black bg-[#FEF08A] text-amber-900">
                          SERVICES
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 font-medium">
                        Live terminal streams and lifecycle management for Docker Compose.
                      </p>
                    </div>

                    {onNavigateServices && (
                      <button
                        type="button"
                        onClick={onNavigateServices}
                        className="neo-btn-white w-full py-1.5 text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>View Terminals</span>
                        <span>&rarr;</span>
                      </button>
                    )}
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

            {/* VIEW: WEBHOOKS & CRON */}
            {activeTab === 'webhooks' && (
              <div className="space-y-5">
                {/* 1. GitHub Webhook Card */}
                <div className="neo-box p-5 bg-white space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-black/10">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-black" />
                      <div>
                        <h4 className="text-sm font-black text-black">GitHub Webhook Auto-Deploy</h4>
                        <p className="text-xs text-zinc-600">
                          Automatically trigger a pipeline build every time code is pushed to GitHub.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                      <input
                        type="checkbox"
                        checked={webhookEnabled}
                        onChange={(e) => setWebhookEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-2 after:border-black after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#22C55E] border-2 border-black" />
                      <span className="ml-2 text-xs font-black text-black uppercase">
                        {webhookEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </label>
                  </div>

                  {webhookEnabled && (
                    <div className="space-y-4 pt-1">
                      {/* Webhook URL Box */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-black flex items-center justify-between">
                          <span>Payload URL (GitHub Webhook Endpoint)</span>
                          <span className="text-[11px] text-zinc-500 font-normal">Send POST requests here</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/api/webhooks/github/${project.slug || project.id}`}
                            className="neo-input font-mono text-xs py-2 bg-zinc-50 text-zinc-800 select-all cursor-text"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/github/${project.slug || project.id}`);
                              setCopiedWebhookUrl(true);
                              setTimeout(() => setCopiedWebhookUrl(false), 2000);
                            }}
                            className="neo-btn-white px-3 py-2 text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000]"
                          >
                            {copiedWebhookUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            <span>{copiedWebhookUrl ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Branch & Secret Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-black text-black">
                            Target Branch
                          </label>
                          <input
                            type="text"
                            value={webhookBranch}
                            onChange={(e) => setWebhookBranch(e.target.value)}
                            placeholder="main"
                            className="neo-input font-mono text-xs py-2"
                          />
                          <p className="text-[10px] text-zinc-500 font-medium">
                            Pushes to other branches will be ignored safely.
                          </p>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-black flex items-center justify-between">
                            <span>Secret Token (HMAC SHA-256)</span>
                            <span className="text-[10px] text-emerald-700 font-bold">Secured</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={webhookSecret}
                              onChange={(e) => setWebhookSecret(e.target.value)}
                              placeholder="Paste or generate secret"
                              className="neo-input font-mono text-xs py-2 flex-1"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  setGeneratingSecret(true);
                                  const res = await api.generateWebhookSecret();
                                  setWebhookSecret(res.secret);
                                } catch (e: any) {
                                  alert(`Failed to generate secret: ${e.message}`);
                                } finally {
                                  setGeneratingSecret(false);
                                }
                              }}
                              disabled={generatingSecret}
                              title="Generate secure random secret"
                              className="neo-btn-yellow p-2 text-xs shrink-0 cursor-pointer shadow-[1.5px_1.5px_0px_#000]"
                            >
                              <RotateCcw className={`w-4 h-4 ${generatingSecret ? 'animate-spin' : ''}`} />
                            </button>
                            {webhookSecret && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(webhookSecret);
                                  setCopiedWebhookSecret(true);
                                  setTimeout(() => setCopiedWebhookSecret(false), 2000);
                                }}
                                title="Copy secret"
                                className="neo-btn-white p-2 text-xs shrink-0 cursor-pointer shadow-[1.5px_1.5px_0px_#000]"
                              >
                                {copiedWebhookSecret ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 font-medium">
                            Paste this secret into GitHub webhook configuration.
                          </p>
                        </div>
                      </div>

                      {/* Instructions Walkthrough Card */}
                      <div className="p-4 rounded-xl bg-[#FAF7EE] border-2 border-black space-y-2 text-xs">
                        <div className="font-black text-black flex items-center gap-1.5">
                          <span>📋</span> <span>GitHub Configuration Checklist:</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-1 text-zinc-700 font-medium leading-relaxed">
                          <li>Navigate to your GitHub repo &rarr; <strong>Settings</strong> &rarr; <strong>Webhooks</strong> &rarr; <strong>Add webhook</strong></li>
                          <li>Paste the <strong>Payload URL</strong> above</li>
                          <li>Select <strong>Content type</strong> as <code className="bg-white px-1.5 py-0.5 rounded border border-black font-mono font-bold text-[11px]">application/json</code></li>
                          <li>Paste the <strong>Secret</strong> key above for cryptographic payload verification</li>
                          <li>Select <strong>&quot;Just the push event&quot;</strong> and click <strong>Add webhook</strong></li>
                        </ol>
                      </div>

                      {/* Webhook Delivery History */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black text-black uppercase tracking-wider">Recent Webhook Deliveries</h5>
                          <button
                            type="button"
                            onClick={() => {
                              if (project?.id) {
                                api.getWebhookHistory(project.id).then(setWebhookEvents).catch(() => {});
                              }
                            }}
                            className="text-[11px] font-bold text-zinc-600 hover:text-black underline cursor-pointer"
                          >
                            Refresh
                          </button>
                        </div>

                        {webhookEvents.length === 0 ? (
                          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-300 text-center text-xs text-zinc-500 font-medium">
                            No webhook deliveries recorded yet. Push commits to GitHub to test auto-deploy!
                          </div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto rounded-xl border-2 border-black divide-y divide-black/10 bg-white">
                            {webhookEvents.slice(0, 8).map((evt) => (
                              <div key={evt.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase border border-black ${
                                      evt.status === 'SUCCESS'
                                        ? 'bg-[#DCFCE7] text-emerald-800'
                                        : evt.status === 'IGNORED'
                                        ? 'bg-zinc-100 text-zinc-700'
                                        : 'bg-[#FEE2E2] text-rose-800'
                                    }`}
                                  >
                                    {evt.status}
                                  </span>
                                  <span className="font-mono text-zinc-500 text-[11px]">
                                    {evt.branch || 'main'}
                                  </span>
                                  {evt.commit_hash && (
                                    <span className="font-mono text-black font-bold text-[11px]">
                                      {evt.commit_hash.slice(0, 7)}
                                    </span>
                                  )}
                                  <span className="truncate text-zinc-700 font-medium">
                                    {evt.commit_message || evt.event_type}
                                  </span>
                                </div>
                                <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                                  {new Date(evt.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Scheduled Deployments (Cron) Card */}
                <div className="neo-box p-5 bg-white space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-black/10">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-black" />
                      <div>
                        <h4 className="text-sm font-black text-black">Scheduled Deployments (Cron)</h4>
                        <p className="text-xs text-zinc-600">
                          Automatically run deployment pipelines on a recurring timetable (nightly builds, periodic syncs).
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                      <input
                        type="checkbox"
                        checked={scheduleEnabled}
                        onChange={(e) => setScheduleEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-2 after:border-black after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#22C55E] border-2 border-black" />
                      <span className="ml-2 text-xs font-black text-black uppercase">
                        {scheduleEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </label>
                  </div>

                  {scheduleEnabled && (
                    <div className="space-y-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-black">
                          Cron Expression or Alias
                        </label>
                        <input
                          type="text"
                          value={scheduleCron}
                          onChange={(e) => setScheduleCron(e.target.value)}
                          placeholder="e.g. 0 0 * * * or @daily"
                          className="neo-input font-mono text-xs py-2"
                        />
                        <p className="text-[10px] text-zinc-500 font-medium">
                          Standard 5-part cron syntax: <code className="font-mono text-black font-bold">minute hour day month weekday</code>
                        </p>
                      </div>

                      {/* Quick Presets */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-extrabold text-black">Quick Presets:</span>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: 'Nightly (@daily)', cron: '@daily' },
                            { label: 'Weekly (@weekly)', cron: '@weekly' },
                            { label: 'Hourly (@hourly)', cron: '@hourly' },
                            { label: 'Every 12h (0 */12 * * *)', cron: '0 */12 * * *' },
                            { label: 'At 2:00 AM (0 2 * * *)', cron: '0 2 * * *' },
                          ].map((preset) => (
                            <button
                              key={preset.cron}
                              type="button"
                              onClick={() => setScheduleCron(preset.cron)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-[#FEF08A] text-black border border-black font-mono text-xs font-bold shadow-[1.5px_1.5px_0px_#000] cursor-pointer transition-colors"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#EFF6FF] border-2 border-black text-xs font-medium text-blue-950">
                        ⏱ <strong>Scheduler Engine:</strong> The Varex internal cron daemon checks every 30 seconds for scheduled matches and spawns automated runs with trigger type <code>SCHEDULE</code>.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: NOTIFICATIONS (Prepared for upcoming integration) */}
            {activeTab === 'notifications' && (
              <div className="neo-box p-6 bg-white space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b-2 border-black/10">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-black" />
                    <div>
                      <h4 className="text-sm font-black text-black">Deployment Notifications</h4>
                      <p className="text-xs text-zinc-500 font-medium">
                        Broadcast build alerts to Discord, Slack, and Telegram when pipelines run.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#FEF08A] text-amber-900 border border-black font-extrabold text-[11px] tracking-wide uppercase">
                    Coming Soon
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-4 rounded-xl border-2 border-black bg-[#FAF7EE] space-y-2">
                    <div className="font-extrabold text-xs text-black flex items-center gap-1.5">
                      <span>💬</span> <span>Discord Webhook</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      Instant message alerts to your Discord channel when deployments start, succeed, or fail.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-black bg-[#FAF7EE] space-y-2">
                    <div className="font-extrabold text-xs text-black flex items-center gap-1.5">
                      <span>⚡</span> <span>Slack Webhook</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      Rich Slack message cards with commit author, commit message, and build duration stats.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-black bg-[#FAF7EE] space-y-2">
                    <div className="font-extrabold text-xs text-black flex items-center gap-1.5">
                      <span>✈️</span> <span>Telegram Bot</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      Direct Telegram push notifications for mobile alerts whenever a production build fails.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#EFF6FF] border-2 border-black text-xs font-medium text-blue-950 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Notification handlers are prepared in the architecture and will be connected in an upcoming update!
                  </span>
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
