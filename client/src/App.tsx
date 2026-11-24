import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Rocket,
  Plus,
  ArrowLeft,
  Settings,
  Trash2,
  Layers,
  Clock,
  History,
  Terminal,
  Key,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GitBranch,
  FolderGit2,
  LayoutGrid,
  List,
  MoreHorizontal,
  Folder,
  Calendar,
  ChevronDown,
  Boxes
} from 'lucide-react';
import { api, setAuthToken, getAuthToken, User, Project, Deployment, PipelineStep } from './api';
import { Navbar } from './components/Navbar';
import { TerminalViewer } from './components/TerminalViewer';
import { StepEditor } from './components/StepEditor';
import { ProjectModal } from './components/ProjectModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { EnvVariablesView } from './components/EnvVariablesView';
import { UserManagementView } from './components/UserManagementView';
import { AuditLogView } from './components/AuditLogView';
import { LiveServicesLogViewer } from './components/LiveServicesLogViewer';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import {
  BackgroundDecorations,
  DoodleSparks,
  HeroServerRocket,
  HeroServerPadlock,
  HeroTerminalServer,
  HeroGearCubeServer,
  AppIconStore,
  AppIconNews,
  AppIconBag,
  AppIconGear,
  AppIconServer,
  AppIconMegaphone
} from './components/Illustrations';

export const App: React.FC = () => {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(true);

  // Main UI Tab
  const [activeTab, setActiveTab] = useState<'projects' | 'audit' | 'users'>('projects');

  // Projects & Search/Filter
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED' | 'PAUSED'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDetailTab, setProjectDetailTab] = useState<'steps' | 'logs' | 'services' | 'history' | 'env'>('steps');
  const [projectServicesCount, setProjectServicesCount] = useState<number>(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Live Deployment & Terminal
  const [activeDeployment, setActiveDeployment] = useState<Deployment | null>(null);
  const [deployHistory, setDeployHistory] = useState<Deployment[]>([]);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
  const [historyTimeFilter, setHistoryTimeFilter] = useState<'ALL' | 'TODAY' | 'WEEK'>('ALL');

  // Users management
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);

  // 1. Initial Auth Check
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      api
        .getMe()
        .then((res) => {
          setCurrentUser(res.user);
        })
        .catch(() => {
          setAuthToken(null);
          setCurrentUser(null);
        })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  // 2. Setup WebSocket Connection when user is authenticated
  useEffect(() => {
    if (!currentUser) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const token = getAuthToken();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (activeDeployment) {
        ws.send(JSON.stringify({ action: 'subscribe', channel: `deploy:${activeDeployment.id}` }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'LOG_CHUNK') {
          setActiveDeployment((prev) => {
            if (!prev || prev.id !== msg.deploymentId) return prev;
            return {
              ...prev,
              logs: (prev.logs || '') + msg.text,
            };
          });
        }

        if (msg.type === 'DEPLOY_STATUS') {
          setActiveDeployment((prev) => {
            if (!prev || prev.id !== msg.deploymentId) return prev;
            return {
              ...prev,
              status: msg.status,
              duration_ms: msg.durationMs ?? prev.duration_ms,
            };
          });

          loadProjects();
        }
      } catch {
        // ignore
      }
    };

    return () => {
      ws.close();
    };
  }, [currentUser]);

  // Subscribe to channel whenever activeDeployment changes
  useEffect(() => {
    if (activeDeployment && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'subscribe', channel: `deploy:${activeDeployment.id}` }));
    }
  }, [activeDeployment?.id]);

  // 3. Load projects and user lists
  const loadProjects = async () => {
    try {
      const list = await api.getProjects();
      setProjects(list);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const loadUsersData = async () => {
    if (currentUser?.role === 'MAIN_ADMIN') {
      try {
        const [pending, all] = await Promise.all([api.getPendingUsers(), api.getAllUsers()]);
        setPendingUsers(pending);
        setAllUsers(all);
      } catch (err) {
        console.error('Failed to load user management data:', err);
      }
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadProjects();
      loadUsersData();
    }
  }, [currentUser, activeTab]);

  // 4. Load single project details when selected
  useEffect(() => {
    if (selectedProjectId) {
      api.getProject(selectedProjectId).then((proj) => {
        setSelectedProject(proj);
      });
      api.getProjectServices(selectedProjectId).then((srvs) => {
        setProjectServicesCount(srvs.length);
      }).catch(() => {});
      api.getDeployHistory(selectedProjectId).then(async (history) => {
        setDeployHistory(history);
        if (history.length > 0) {
          const dep = await api.getDeployment(history[0].id);
          setActiveDeployment(dep);
        }
      });
    } else {
      setSelectedProject(null);
      setProjectServicesCount(0);
    }
  }, [selectedProjectId, projectDetailTab]);

  // Polling backup while deployment is running
  useEffect(() => {
    if (!activeDeployment) return;
    const isRunning = activeDeployment.status === 'RUNNING' || activeDeployment.status === 'QUEUED';
    if (!isRunning) return;

    const interval = setInterval(async () => {
      try {
        const latest = await api.getDeployment(activeDeployment.id);
        if (latest) {
          setActiveDeployment(latest);
          if (latest.status !== 'RUNNING' && latest.status !== 'QUEUED') {
            loadProjects();
            if (selectedProjectId) {
              const h = await api.getDeployHistory(selectedProjectId);
              setDeployHistory(h);
            }
          }
        }
      } catch {
        // ignore
      }
    }, 500);

    return () => clearInterval(interval);
  }, [activeDeployment?.id, activeDeployment?.status]);

  // Actions
  const handleTriggerDeploy = async (projectId: number) => {
    try {
      setSelectedProjectId(projectId);
      setProjectDetailTab('logs');

      const res = await api.triggerDeploy(projectId);
      setActiveDeployment(res.deployment);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'subscribe', channel: `deploy:${res.deployment.id}` }));
      }

      loadProjects();
      const history = await api.getDeployHistory(projectId);
      setDeployHistory(history);
    } catch (err: any) {
      alert(`Deployment failed to start: ${err.message}`);
    }
  };

  const handleAbortDeploy = async () => {
    if (!activeDeployment) return;
    try {
      await api.abortDeploy(activeDeployment.id);
    } catch (err: any) {
      alert(`Abort command failed: ${err.message}`);
    }
  };

  const handleSaveSteps = async (steps: PipelineStep[]) => {
    if (!selectedProjectId) return;
    const res = await api.saveSteps(selectedProjectId, steps);
    if (selectedProject) {
      setSelectedProject({ ...selectedProject, steps: res.steps });
    }
    loadProjects();
  };

  const handleCreateProject = async (data: {
    name: string;
    description: string;
    project_path: string;
    env_vars: Record<string, string>;
    steps: PipelineStep[];
  }) => {
    const created = await api.createProject(data);
    await loadProjects();
    setSelectedProjectId(created.id);
  };

  const handleUpdateProject = async (data: {
    name: string;
    description: string;
    project_path: string;
    env_vars: Record<string, string>;
    steps: PipelineStep[];
    sudoPassword?: string;
  }) => {
    if (!editingProject) return;
    const updated = await api.updateProject(editingProject.id, data);
    if (data.steps) {
      await api.saveSteps(editingProject.id, data.steps);
    }
    setSelectedProject(updated);
    setEditingProject(null);
    loadProjects();
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project and all its pipeline steps?')) return;
    await api.deleteProject(id);
    if (selectedProjectId === id) setSelectedProjectId(null);
    setEditingProject(null);
    loadProjects();
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.project_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'SUCCESS') return p.last_deploy_status === 'SUCCESS';
      if (statusFilter === 'FAILED') return p.last_deploy_status === 'FAILED';
      if (statusFilter === 'PAUSED') return !p.last_deploy_status || p.last_deploy_status === 'ABORTED';
      return true;
    });
  }, [projects, searchQuery, statusFilter]);

  const liveCount = useMemo(() => projects.filter((p) => p.last_deploy_status === 'SUCCESS').length, [projects]);
  const failedCount = useMemo(() => projects.filter((p) => p.last_deploy_status === 'FAILED').length, [projects]);
  const pausedCount = useMemo(() => projects.filter((p) => !p.last_deploy_status || p.last_deploy_status === 'ABORTED').length, [projects]);

  const filteredDeployHistory = useMemo(() => {
    return deployHistory.filter((d) => {
      if (historyStatusFilter === 'SUCCESS' && d.status !== 'SUCCESS') return false;
      if (historyStatusFilter === 'FAILED' && d.status !== 'FAILED') return false;
      if (historyTimeFilter === 'TODAY') {
        const today = new Date().toDateString();
        if (new Date(d.started_at).toDateString() !== today) return false;
      }
      return true;
    });
  }, [deployHistory, historyStatusFilter, historyTimeFilter]);

  // Color & Icon mapping for projects (Image 9)
  const getProjectVisuals = (name: string, index: number) => {
    const colors = ['bg-[#A855F7]', 'bg-[#38BDF8]', 'bg-[#FB7185]', 'bg-[#2DD4BF]', 'bg-[#818CF8]', 'bg-[#FACC15]'];
    const icons = [
      <AppIconStore className="w-12 h-12" />,
      <AppIconNews className="w-12 h-12" />,
      <AppIconBag className="w-12 h-12" />,
      <AppIconGear className="w-12 h-12" />,
      <AppIconServer className="w-12 h-12" />,
      <AppIconMegaphone className="w-12 h-12" />,
    ];

    const initials = name.slice(0, 2).toUpperCase();
    return {
      initial: initials,
      bg: colors[index % colors.length],
      icon: icons[index % icons.length],
    };
  };

  // Auth Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7EE] text-black font-mono text-xs">
        <BackgroundDecorations />
        <div className="w-12 h-12 rounded-xl bg-[#FACC15] border-2 border-black flex items-center justify-center text-black font-black text-xl mb-3 shadow-[3px_3px_0px_#000000]">
          &gt;_
        </div>
        <span className="font-extrabold text-sm">Initializing Varex CI/CD...</span>
      </div>
    );
  }

  // Not authenticated: Show Login or Register
  if (!currentUser) {
    if (authView === 'register') {
      return <RegisterPage onNavigateLogin={() => setAuthView('login')} />;
    }
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
        onNavigateRegister={() => setAuthView('register')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7EE] text-black flex flex-col font-sans relative">
      <BackgroundDecorations />

      {/* Top Navigation */}
      <Navbar
        user={currentUser}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'projects') setSelectedProjectId(null);
        }}
        onLogout={async () => {
          await api.logout();
          setCurrentUser(null);
        }}
        pendingUsersCount={pendingUsers.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 relative z-10">
        {/* TAB 1: AUDIT TRAIL */}
        {activeTab === 'audit' && <AuditLogView />}

        {/* TAB 2: TEAM MEMBERS (MAIN ADMIN ONLY) */}
        {activeTab === 'users' && currentUser.role === 'MAIN_ADMIN' && (
          <UserManagementView
            currentUser={currentUser}
            pendingUsers={pendingUsers}
            allUsers={allUsers}
            onRefresh={loadUsersData}
          />
        )}

        {/* TAB 3: APPLICATIONS CATALOG (Image 9) */}
        {activeTab === 'projects' && (
          <div>
            {!selectedProjectId ? (
              // APPLICATIONS CATALOG VIEW (Image 9)
              <div className="space-y-6">
                {/* Hero Banner (Image 9) */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-2">
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-zinc-500 tracking-widest uppercase">
                      WORKSPACE
                    </p>
                    <div className="flex items-center gap-2">
                      <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight flex items-center gap-2 flex-wrap">
                        <span>Applications</span>
                      </h1>
                      <DoodleSparks className="w-6 h-6 inline-block" />
                    </div>
                    <p className="text-xs text-zinc-600 font-medium">
                      Manage your projects, configure pipelines, and deploy with ease.
                    </p>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <HeroServerRocket className="w-44 h-24 hidden lg:block" />

                    {currentUser.role === 'MAIN_ADMIN' && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="neo-btn-yellow px-5 py-2.5 text-xs flex items-center gap-2 shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>New Application</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Toolbar (Image 9) */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  {/* Status Filter Pills container */}
                  <div className="flex items-center p-1 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_#000000] overflow-x-auto">
                    <button
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-3.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        statusFilter === 'ALL'
                          ? 'bg-[#FACC15] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000000]'
                          : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>All Applications</span>
                      <span className="w-4 h-4 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center ml-1">
                        {projects.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setStatusFilter('SUCCESS')}
                      className={`px-3.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        statusFilter === 'SUCCESS'
                          ? 'bg-[#DCFCE7] text-[#15803D] border-2 border-black shadow-[1.5px_1.5px_0px_#000000]'
                          : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                      <span>Live</span>
                      <span className="text-[11px] text-zinc-500 font-bold ml-1">{liveCount}</span>
                    </button>

                    <button
                      onClick={() => setStatusFilter('FAILED')}
                      className={`px-3.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        statusFilter === 'FAILED'
                          ? 'bg-[#FEE2E2] text-[#B91C1C] border-2 border-black shadow-[1.5px_1.5px_0px_#000000]'
                          : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                      <span>Failed</span>
                      <span className="text-[11px] text-zinc-500 font-bold ml-1">{failedCount}</span>
                    </button>

                    <button
                      onClick={() => setStatusFilter('PAUSED')}
                      className={`px-3.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        statusFilter === 'PAUSED'
                          ? 'bg-zinc-200 text-zinc-800 border-2 border-black shadow-[1.5px_1.5px_0px_#000000]'
                          : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-zinc-400" />
                      <span>Paused</span>
                      <span className="text-[11px] text-zinc-500 font-bold ml-1">{pausedCount}</span>
                    </button>
                  </div>

                  {/* Search and Grid/List toggles */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 md:w-64">
                      <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search applications..."
                        className="neo-input pl-9"
                      />
                    </div>

                    <div className="flex items-center border-2 border-black rounded-xl overflow-hidden bg-white shadow-[2px_2px_0px_#000000] shrink-0">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-black text-white' : 'text-black hover:bg-zinc-100'}`}
                        title="Grid View"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-black text-white' : 'text-black hover:bg-zinc-100'}`}
                        title="List View"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Applications 3-Column Cards Grid (Image 9) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredProjects.map((proj, idx) => {
                    const visuals = getProjectVisuals(proj.name, idx);
                    const stepCount = proj.step_count || proj.steps?.length || 4;
                    const isSuccess = proj.last_deploy_status === 'SUCCESS';
                    const isFailed = proj.last_deploy_status === 'FAILED';

                    return (
                      <div
                        key={proj.id}
                        className="neo-box p-5 bg-white flex flex-col justify-between hover:translate-y-[-2px] transition-all cursor-pointer"
                        onClick={() => setSelectedProjectId(proj.id)}
                      >
                        <div>
                          {/* Card Top: Initial Avatar + Name + Status + Tech Icon (Image 9) */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl ${visuals.bg} text-white font-black text-base flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000] shrink-0`}
                              >
                                {visuals.initial}
                              </div>
                              <div>
                                <h3 className="font-black text-base text-black leading-tight">
                                  {proj.name}
                                </h3>
                                <div className="mt-1">
                                  {isSuccess && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border-2 border-black font-extrabold text-[11px]">
                                      <span className="w-2 h-2 rounded-full bg-[#22C55E]" /> Live
                                    </span>
                                  )}
                                  {isFailed && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#B91C1C] border-2 border-black font-extrabold text-[11px]">
                                      <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Failed
                                    </span>
                                  )}
                                  {!isSuccess && !isFailed && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border-2 border-black font-extrabold text-[11px]">
                                      <span className="w-2 h-2 rounded-full bg-zinc-400" /> Paused
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0">{visuals.icon}</div>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-zinc-600 line-clamp-2 mb-3 leading-relaxed font-medium">
                            {proj.description || 'Application for managing pipeline and deployments.'}
                          </p>

                          {/* Metadata row: branch | steps | time */}
                          <div className="flex items-center gap-3 text-xs text-zinc-700 font-bold mb-4 pb-3 border-b-2 border-black/10">
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <GitBranch className="w-3.5 h-3.5 text-zinc-500" /> main
                            </span>
                            <span>|</span>
                            <span className="flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-zinc-500" /> {stepCount} Steps
                            </span>
                            <span>|</span>
                            <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-500">
                              <Clock className="w-3.5 h-3.5" /> 2m ago
                            </span>
                          </div>

                          {/* Horizontal Pipeline Steps Mini-Graph (Image 9) */}
                          <div className="mb-4">
                            <div className="p-2.5 rounded-full bg-[#F1ECE1] border-2 border-black flex items-center justify-between gap-1 shadow-[2px_2px_0px_#000000]">
                              {Array.from({ length: Math.min(stepCount, 5) }).map((_, sIdx) => {
                                const isCross = isFailed && sIdx === Math.min(stepCount, 5) - 1;
                                return (
                                  <React.Fragment key={sIdx}>
                                    <div
                                      className={`w-6 h-6 rounded-md border-2 border-black flex items-center justify-center font-bold text-xs ${
                                        isCross ? 'bg-[#FEE2E2] text-rose-600' : 'bg-[#DCFCE7] text-[#15803D]'
                                      }`}
                                    >
                                      {isCross ? '✕' : '✓'}
                                    </div>
                                    {sIdx < Math.min(stepCount, 5) - 1 && (
                                      <div className="flex-1 h-[2px] bg-black" />
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Card Buttons: Deploy | Pipeline | ... (Image 9) */}
                        <div
                          className="flex items-center gap-2 pt-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleTriggerDeploy(proj.id)}
                            className="flex-1 neo-btn-white py-1.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Rocket className="w-3.5 h-3.5" />
                            <span>Deploy</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedProjectId(proj.id)}
                            className="flex-1 neo-btn-white py-1.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Pipeline</span>
                          </button>

                          {currentUser.role === 'MAIN_ADMIN' && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const full = await api.getProject(proj.id);
                                  setEditingProject(full);
                                } catch {
                                  setEditingProject(proj);
                                }
                              }}
                              className="neo-btn-white p-1.5 text-xs cursor-pointer"
                              title="Settings"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Empty State */}
                {filteredProjects.length === 0 && (
                  <div className="py-16 text-center neo-box p-8 bg-white max-w-lg mx-auto">
                    <FolderGit2 className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
                    <h3 className="text-base font-extrabold text-black mb-1">
                      {searchQuery ? 'No matching applications' : 'No applications registered yet'}
                    </h3>
                    <p className="text-xs text-zinc-600 mb-5 font-medium">
                      {searchQuery
                        ? 'Try adjusting your search query or status filter.'
                        : 'Register your first project by pointing to its host server directory.'}
                    </p>
                    {currentUser.role === 'MAIN_ADMIN' && !searchQuery && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="neo-btn-yellow px-5 py-2 text-xs"
                      >
                        Register First Application
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // PROJECT WORKSPACE / DETAIL VIEW (Images 1, 2, 3, 4)
              selectedProject && (
                <div className="space-y-6">
                  {/* Project Workspace Header */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b-2 border-black">
                    <div className="space-y-2 min-w-0 max-w-full">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <button
                          onClick={() => setSelectedProjectId(null)}
                          className="neo-btn-white px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Back</span>
                        </button>

                        <div className="flex items-center gap-2 min-w-0">
                          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-black tracking-tight truncate">
                            {selectedProject.name}
                          </h1>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#BFDBFE] text-blue-900 border border-black font-mono font-bold text-xs shrink-0">
                            {selectedProject.slug || selectedProject.name.toLowerCase()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-700 pl-1 min-w-0 max-w-full">
                        <FolderGit2 className="w-3.5 h-3.5 text-black shrink-0" />
                        <span className="truncate break-all" title={selectedProject.project_path}>
                          {selectedProject.project_path}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 font-medium pl-1 line-clamp-2">
                        Configure pipeline steps, environment and deploy your application.
                      </p>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 shrink-0 w-full sm:w-auto justify-end">
                      {projectDetailTab === 'steps' && (
                        <HeroGearCubeServer className="w-44 h-24 hidden lg:block" />
                      )}
                      {(projectDetailTab === 'logs' || projectDetailTab === 'services') && (
                        <HeroTerminalServer className="w-44 h-24 hidden lg:block" />
                      )}
                      {projectDetailTab === 'history' && (
                        <HeroServerRocket className="w-44 h-24 hidden lg:block" />
                      )}
                      {projectDetailTab === 'env' && (
                        <HeroServerPadlock className="w-44 h-24 hidden lg:block" />
                      )}

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => handleTriggerDeploy(selectedProject.id)}
                          className="neo-btn-yellow flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 text-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Rocket className="w-4 h-4 stroke-[3]" />
                          <span>Deploy</span>
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              const full = await api.getProject(selectedProject.id);
                              setEditingProject(full);
                            } catch {
                              setEditingProject(selectedProject);
                            }
                          }}
                          className="neo-btn-white p-2.5 text-xs cursor-pointer shrink-0"
                          title="Project Settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteProject(selectedProject.id)}
                          className="neo-btn-white p-2.5 text-xs hover:bg-rose-50 cursor-pointer shrink-0"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subnav Tabs: Pipeline Steps | Terminal Output | History | Environment */}
                  <div className="flex items-center gap-2 pb-2 overflow-x-auto border-b-2 border-black/10 scrollbar-thin">
                    <button
                      onClick={() => setProjectDetailTab('steps')}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                        projectDetailTab === 'steps'
                          ? 'bg-[#FACC15] text-black border-2 border-black shadow-[2px_2px_0px_#000000]'
                          : 'text-black hover:bg-black/5'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>Pipeline Steps ({selectedProject.steps?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => setProjectDetailTab('logs')}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                        projectDetailTab === 'logs'
                          ? 'bg-[#FACC15] text-black border-2 border-black shadow-[2px_2px_0px_#000000]'
                          : 'text-black hover:bg-black/5'
                      }`}
                    >
                      <Terminal className="w-4 h-4" />
                      <span>Terminal Output</span>
                    </button>

                    <button
                      onClick={() => setProjectDetailTab('services')}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                        projectDetailTab === 'services'
                          ? 'bg-[#FACC15] text-black border-2 border-black shadow-[2px_2px_0px_#000000]'
                          : 'text-black hover:bg-black/5'
                      }`}
                    >
                      <Boxes className="w-4 h-4" />
                      <span>Live Container Logs</span>
                      {projectServicesCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-black text-white text-[10px] font-black">
                          {projectServicesCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setProjectDetailTab('history')}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                        projectDetailTab === 'history'
                          ? 'bg-[#FACC15] text-black border-2 border-black shadow-[2px_2px_0px_#000000]'
                          : 'text-black hover:bg-black/5'
                      }`}
                    >
                      <History className="w-4 h-4" />
                      <span>History ({deployHistory.length})</span>
                    </button>

                    <button
                      onClick={() => setProjectDetailTab('env')}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                        projectDetailTab === 'env'
                          ? 'bg-[#FACC15] text-black border-2 border-black shadow-[2px_2px_0px_#000000]'
                          : 'text-black hover:bg-black/5'
                      }`}
                    >
                      <Key className="w-4 h-4" />
                      <span>Environment ({Object.keys(selectedProject.env_vars || {}).length})</span>
                    </button>
                  </div>

                  {/* Tab 1: Pipeline Steps Editor (Image 4) */}
                  {projectDetailTab === 'steps' && (
                    <StepEditor
                      steps={selectedProject.steps || []}
                      onSave={handleSaveSteps}
                      readOnly={currentUser.role !== 'MAIN_ADMIN'}
                    />
                  )}

                  {/* Tab 2: Terminal Output (Image 3) */}
                  {projectDetailTab === 'logs' && (
                    <div className="space-y-4">
                      {activeDeployment ? (
                        <TerminalViewer
                          deploymentId={activeDeployment.id}
                          projectName={selectedProject.name}
                          status={activeDeployment.status}
                          logs={activeDeployment.logs}
                          durationMs={activeDeployment.duration_ms}
                          startedAt={activeDeployment.started_at ? new Date(activeDeployment.started_at).toLocaleString() : undefined}
                          triggeredBy={activeDeployment.triggered_by_username || 'admin'}
                          projectSteps={selectedProject.steps || []}
                          onAbort={handleAbortDeploy}
                        />
                      ) : (
                        <div className="neo-box p-12 bg-white text-center">
                          <Terminal className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
                          <h4 className="text-base font-extrabold text-black mb-1">
                            No deployment runs recorded yet
                          </h4>
                          <p className="text-xs text-zinc-600 mb-5">
                            Trigger a build to watch live logs in the console.
                          </p>
                          <button
                            onClick={() => handleTriggerDeploy(selectedProject.id)}
                            className="neo-btn-yellow px-5 py-2 text-xs"
                          >
                            Trigger First Deploy
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab: Live Container Logs for Multi-Service / Docker Compose */}
                  {projectDetailTab === 'services' && (
                    <LiveServicesLogViewer
                      projectId={selectedProject.id}
                      projectName={selectedProject.name}
                      projectPath={selectedProject.project_path}
                      currentUser={currentUser}
                      ws={wsRef.current}
                      onServicesCountChange={(count) => setProjectServicesCount(count)}
                    />
                  )}

                  {/* Tab 3: History Table (Image 2) */}
                  {projectDetailTab === 'history' && (
                    <div className="space-y-4">
                      <div className="neo-box p-5 bg-white space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b-2 border-black">
                          <div className="flex items-center gap-2.5">
                            <Clock className="w-5 h-5 text-black" />
                            <div>
                              <h3 className="text-base font-extrabold text-black">Deployment History</h3>
                              <p className="text-xs text-zinc-600">
                                All deployment runs for this application, with status, duration, and logs.
                              </p>
                            </div>
                          </div>

                          {/* Filter Dropdowns (Image 2) */}
                          <div className="flex items-center gap-2 self-stretch sm:self-auto">
                            <select
                              value={historyStatusFilter}
                              onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                              className="neo-input font-bold text-xs cursor-pointer py-1.5 px-3 bg-white"
                            >
                              <option value="ALL">All Status</option>
                              <option value="SUCCESS">Success Only</option>
                              <option value="FAILED">Failed Only</option>
                            </select>

                            <select
                              value={historyTimeFilter}
                              onChange={(e) => setHistoryTimeFilter(e.target.value as any)}
                              className="neo-input font-bold text-xs cursor-pointer py-1.5 px-3 bg-white"
                            >
                              <option value="ALL">All Time</option>
                              <option value="TODAY">Today</option>
                              <option value="WEEK">This Week</option>
                            </select>
                          </div>
                        </div>

                        {/* History Table (Image 2) */}
                        <div className="overflow-x-auto -mx-1 sm:mx-0">
                          <table className="w-full text-left text-xs min-w-[680px]">
                            <thead>
                              <tr className="border-b-2 border-black bg-[#FAF7EE] text-black font-extrabold">
                                <th className="py-2.5 px-3">Run ID</th>
                                <th className="py-2.5 px-3">Status</th>
                                <th className="py-2.5 px-3">Triggered By</th>
                                <th className="py-2.5 px-3">Started At</th>
                                <th className="py-2.5 px-3">Duration</th>
                                <th className="py-2.5 px-3">Steps</th>
                                <th className="py-2.5 px-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-black/10">
                              {filteredDeployHistory.map((d) => (
                                <tr key={d.id} className="hover:bg-zinc-50 transition-colors">
                                  <td className="py-3 px-3">
                                    <span className="px-2.5 py-1 rounded-lg bg-[#EDE9FE] text-purple-900 border border-black font-mono font-bold text-xs">
                                      #{d.id}
                                    </span>
                                  </td>

                                  <td className="py-3 px-3">
                                    {d.status === 'SUCCESS' && (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] border-2 border-black font-extrabold text-[11px] shadow-[1.5px_1.5px_0px_#000000]">
                                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" /> SUCCESS
                                      </span>
                                    )}
                                    {d.status === 'FAILED' && (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEE2E2] text-[#B91C1C] border-2 border-black font-extrabold text-[11px] shadow-[1.5px_1.5px_0px_#000000]">
                                        <XCircle className="w-3.5 h-3.5 stroke-[3]" /> FAILED
                                      </span>
                                    )}
                                    {d.status === 'RUNNING' && (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0F2FE] text-[#0369A1] border-2 border-black font-extrabold text-[11px] shadow-[1.5px_1.5px_0px_#000000]">
                                        <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" /> RUNNING
                                      </span>
                                    )}
                                    {d.status !== 'SUCCESS' && d.status !== 'FAILED' && d.status !== 'RUNNING' && (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 border-2 border-black font-extrabold text-[11px]">
                                        {d.status}
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-3 px-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-md bg-[#818CF8] text-white font-extrabold text-[11px] flex items-center justify-center border border-black shadow-[1px_1px_0px_#000000]">
                                        {(d.triggered_by_username || 'A').slice(0, 1).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="font-extrabold text-black">{d.triggered_by_username || 'admin'}</div>
                                        <div className="text-[10px] text-zinc-600 font-bold uppercase">MAIN ADMIN</div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="py-3 px-3 font-mono text-zinc-700 font-medium whitespace-nowrap">
                                    {new Date(d.started_at).toLocaleString()}
                                  </td>

                                  <td className="py-3 px-3 font-mono font-bold text-black">
                                    {d.duration_ms ? `${(d.duration_ms / 1000).toFixed(1)}s` : '-'}
                                  </td>

                                  {/* Steps Mini Graph (Image 2) */}
                                  <td className="py-3 px-3">
                                    <div className="inline-flex items-center gap-1">
                                      {Array.from({ length: Math.min(selectedProject.steps?.length || 4, 5) }).map((_, sIdx) => {
                                        const isCross = d.status === 'FAILED' && sIdx === Math.min(selectedProject.steps?.length || 4, 5) - 1;
                                        return (
                                          <React.Fragment key={sIdx}>
                                            <div
                                              className={`w-5 h-5 rounded-md border-2 border-black flex items-center justify-center font-bold text-[10px] ${
                                                isCross ? 'bg-[#FEE2E2] text-rose-600' : 'bg-[#DCFCE7] text-[#15803D]'
                                              }`}
                                            >
                                              {isCross ? '✕' : '✓'}
                                            </div>
                                            {sIdx < Math.min(selectedProject.steps?.length || 4, 5) - 1 && (
                                              <div className="w-2.5 h-[2px] bg-black" />
                                            )}
                                          </React.Fragment>
                                        );
                                      })}
                                    </div>
                                  </td>

                                  {/* Actions: View Terminal + ... (Image 2) */}
                                  <td className="py-3 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={async () => {
                                          const full = await api.getDeployment(d.id);
                                          setActiveDeployment(full);
                                          setProjectDetailTab('logs');
                                        }}
                                        className="neo-btn-white px-3 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-[1.5px_1.5px_0px_#000000]"
                                      >
                                        <Terminal className="w-3.5 h-3.5" />
                                        <span>View Terminal</span>
                                      </button>

                                      <button
                                        type="button"
                                        className="p-1.5 rounded-lg border-2 border-black bg-white hover:bg-zinc-100 shadow-[1.5px_1.5px_0px_#000000] cursor-pointer"
                                        title="Deployment options"
                                      >
                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}

                              {filteredDeployHistory.length === 0 && (
                                <tr>
                                  <td colSpan={7} className="py-8 text-center text-zinc-500 font-medium">
                                    No deployment runs recorded matching the selected filter.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Environment Variables (Image 1) */}
                  {projectDetailTab === 'env' && (
                    <EnvVariablesView
                      projectId={selectedProject.id}
                      projectName={selectedProject.name}
                      projectPath={selectedProject.project_path}
                      envFilePath={selectedProject.env_file_path}
                      envFileExists={selectedProject.env_file_exists}
                      envFileMtime={selectedProject.env_file_mtime}
                      initialEnvVars={selectedProject.env_vars || {}}
                      readOnly={currentUser.role !== 'MAIN_ADMIN'}
                      onSaved={async () => {
                        const updated = await api.getProject(selectedProject.id);
                        setSelectedProject(updated);
                        loadProjects();
                      }}
                    />
                  )}
                </div>
              )
            )}
          </div>
        )}
      </main>

      {/* DEDICATED CREATE PROJECT MODAL */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}

      {/* DEDICATED PROJECT SETTINGS MODAL */}
      {editingProject && (
        <ProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={handleUpdateProject}
          onNavigateEnv={() => {
            if (editingProject) {
              setSelectedProjectId(editingProject.id);
              setProjectDetailTab('env');
            }
            setEditingProject(null);
          }}
          onNavigateServices={() => {
            if (editingProject) {
              setSelectedProjectId(editingProject.id);
              setProjectDetailTab('services');
            }
            setEditingProject(null);
          }}
          onDeleteProject={handleDeleteProject}
        />
      )}
    </div>
  );
};
