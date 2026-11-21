import React, { useState, useEffect, useRef } from 'react';
import {
  Rocket,
  Plus,
  Play,
  RotateCcw,
  Terminal,
  FolderGit2,
  Settings,
  Trash2,
  ExternalLink,
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  FileCode,
  Sparkles,
  Server
} from 'lucide-react';
import { api, setAuthToken, getAuthToken, User, Project, Deployment, PipelineStep } from './api';
import { Navbar } from './components/Navbar';
import { TerminalViewer } from './components/TerminalViewer';
import { StepEditor } from './components/StepEditor';
import { ProjectModal } from './components/ProjectModal';
import { UserManagementView } from './components/UserManagementView';
import { AuditLogView } from './components/AuditLogView';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

export const App: React.FC = () => {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(true);

  // Main UI Tab
  const [activeTab, setActiveTab] = useState<'projects' | 'audit' | 'users'>('projects');

  // Projects & Steps
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDetailTab, setProjectDetailTab] = useState<'steps' | 'logs' | 'history'>('steps');

  // Modals & Drawers
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Live Deployment & Terminal
  const [activeDeployment, setActiveDeployment] = useState<Deployment | null>(null);
  const [deployHistory, setDeployHistory] = useState<Deployment[]>([]);
  const [showTerminalDrawer, setShowTerminalDrawer] = useState(false);

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
      console.log('[WS] Connected to Varex live stream');
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

          // Refresh project list to update status badge
          loadProjects();
        }
      } catch (err) {
        // ignore malformed
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected from Varex live stream');
    };

    return () => {
      ws.close();
    };
  }, [currentUser]);

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
      api.getDeployHistory(selectedProjectId).then(async (history) => {
        setDeployHistory(history);
        if (history.length > 0) {
          const dep = await api.getDeployment(history[0].id);
          setActiveDeployment(dep);
        }
      });
    } else {
      setSelectedProject(null);
    }
  }, [selectedProjectId, projectDetailTab]);

  // Polling backup while deployment is running to ensure real-time terminal logs
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
        // ignore network error
      }
    }, 500);

    return () => clearInterval(interval);
  }, [activeDeployment?.id, activeDeployment?.status]);

  // 5. Actions
  const handleTriggerDeploy = async (projectId: number) => {
    try {
      setSelectedProjectId(projectId);
      setProjectDetailTab('logs');
      setShowTerminalDrawer(true);

      const res = await api.triggerDeploy(projectId);
      setActiveDeployment(res.deployment);

      // Subscribe to WebSocket channel
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

  const handleSaveProject = async (data: {
    name: string;
    description: string;
    project_path: string;
    env_vars: Record<string, string>;
    steps: PipelineStep[];
  }) => {
    if (editingProject) {
      const updated = await api.updateProject(editingProject.id, data);
      if (data.steps) {
        await api.saveSteps(editingProject.id, data.steps);
      }
      setSelectedProject(updated);
    } else {
      const created = await api.createProject(data);
      setSelectedProjectId(created.id);
    }
    loadProjects();
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project and all its pipeline steps?')) return;
    await api.deleteProject(id);
    if (selectedProjectId === id) setSelectedProjectId(null);
    loadProjects();
  };

  // Auth Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070a12] text-slate-400 font-mono text-xs">
        Initializing secure environment...
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
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: AUDIT LOGS */}
        {activeTab === 'audit' && <AuditLogView />}

        {/* TAB 2: USER MANAGEMENT (MAIN ADMIN ONLY) */}
        {activeTab === 'users' && currentUser.role === 'MAIN_ADMIN' && (
          <UserManagementView
            currentUser={currentUser}
            pendingUsers={pendingUsers}
            allUsers={allUsers}
            onRefresh={loadUsersData}
          />
        )}

        {/* TAB 3: PROJECTS & PIPELINES */}
        {activeTab === 'projects' && (
          <div>
            {!selectedProjectId ? (
              // PROJECTS CATALOG VIEW
              <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                      <FolderGit2 className="w-6 h-6 text-cyan-400" />
                      Applications & Deployments
                    </h1>
                    <p className="text-xs text-slate-400">
                      Configure execution steps, trigger live builds, and monitor production status.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => {
                        setEditingProject(null);
                        setShowProjectModal(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all"
                    >
                      <Plus className="w-4 h-4" /> New Project
                    </button>
                  </div>
                </div>

                {/* Projects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between shadow-xl group"
                    >
                      <div>
                        {/* Status & Name */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-bold text-base text-white group-hover:text-cyan-300 transition-colors">
                            {proj.name}
                          </h3>

                          {proj.last_deploy_status === 'SUCCESS' && (
                            <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> LIVE
                            </span>
                          )}
                          {proj.last_deploy_status === 'FAILED' && (
                            <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
                              <XCircle className="w-3 h-3" /> FAILED
                            </span>
                          )}
                          {proj.last_deploy_status === 'RUNNING' && (
                            <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0 animate-pulse">
                              <Play className="w-3 h-3 animate-spin" /> RUNNING
                            </span>
                          )}
                          {!proj.last_deploy_status && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                              NEVER RUN
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                          {proj.description || 'No description provided.'}
                        </p>

                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 mb-4">
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mb-0.5">
                            <Server className="w-3 h-3" /> Host Directory:
                          </div>
                          <div className="font-mono text-xs text-cyan-300 truncate" title={proj.project_path}>
                            {proj.project_path}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                            {proj.step_count} Pipeline Step{proj.step_count === 1 ? '' : 's'}
                          </span>
                          {proj.last_deploy_at ? (
                            <span className="text-[11px] text-slate-500 font-mono">
                              {new Date(proj.last_deploy_at).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                        <button
                          onClick={() => handleTriggerDeploy(proj.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold shadow-md transition-all"
                        >
                          <Rocket className="w-3.5 h-3.5" /> Deploy
                        </button>

                        <button
                          onClick={() => setSelectedProjectId(proj.id)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                        >
                          Steps
                        </button>

                        <button
                          onClick={() => {
                            setEditingProject(proj);
                            setShowProjectModal(true);
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                          title="Settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {projects.length === 0 && (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-800 rounded-3xl p-8">
                      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
                        <FolderGit2 className="w-7 h-7" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-1">No Projects Registered Yet</h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
                        Register your first project by pointing to its host path and defining sequential deployment steps.
                      </p>
                      <button
                        onClick={() => {
                          setEditingProject(null);
                          setShowProjectModal(true);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shadow-lg shadow-cyan-500/20"
                      >
                        Register First Project
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // PROJECT DETAIL / WORKSPACE VIEW
              selectedProject && (
                <div className="space-y-6">
                  {/* Top Bar for Project Detail */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedProjectId(null)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors"
                      >
                        ← Back
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-lg font-bold text-white">{selectedProject.name}</h1>
                          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                            {selectedProject.slug}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Server className="w-3.5 h-3.5 text-slate-500" /> Path: {selectedProject.project_path}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTriggerDeploy(selectedProject.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all"
                      >
                        <Rocket className="w-4 h-4" /> Run Deploy Now
                      </button>

                      <button
                        onClick={() => {
                          setEditingProject(selectedProject);
                          setShowProjectModal(true);
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                        title="Edit Project"
                      >
                        <Settings className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteProject(selectedProject.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors border border-slate-700"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Project Workspace Tabs */}
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <button
                      onClick={() => setProjectDetailTab('steps')}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        projectDetailTab === 'steps'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Layers className="w-4 h-4" /> Pipeline Steps ({selectedProject.steps?.length || 0})
                    </button>

                    <button
                      onClick={() => setProjectDetailTab('logs')}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        projectDetailTab === 'logs'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Terminal className="w-4 h-4" /> Live Terminal & Output
                    </button>

                    <button
                      onClick={() => setProjectDetailTab('history')}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        projectDetailTab === 'history'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <History className="w-4 h-4" /> Deploy History ({deployHistory.length})
                    </button>
                  </div>

                  {/* Workspace Content */}
                  {projectDetailTab === 'steps' && (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                      <StepEditor
                        steps={selectedProject.steps || []}
                        onSave={handleSaveSteps}
                      />
                    </div>
                  )}

                  {projectDetailTab === 'logs' && (
                    <div className="h-[600px]">
                      {activeDeployment ? (
                        <TerminalViewer
                          deploymentId={activeDeployment.id}
                          projectName={selectedProject.name}
                          status={activeDeployment.status}
                          logs={activeDeployment.logs}
                          durationMs={activeDeployment.duration_ms}
                          onAbort={handleAbortDeploy}
                        />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-800 rounded-2xl text-center">
                          <Terminal className="w-10 h-10 text-slate-600 mb-3" />
                          <p className="text-slate-400 text-sm mb-4">No deployment logs available yet for this project.</p>
                          <button
                            onClick={() => handleTriggerDeploy(selectedProject.id)}
                            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shadow-lg shadow-cyan-500/20"
                          >
                            Trigger First Deploy
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {projectDetailTab === 'history' && (
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="pb-3 font-medium">Run ID</th>
                              <th className="pb-3 font-medium">Status</th>
                              <th className="pb-3 font-medium">Triggered By</th>
                              <th className="pb-3 font-medium">Started At</th>
                              <th className="pb-3 font-medium">Duration</th>
                              <th className="pb-3 font-medium text-right">View Output</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                            {deployHistory.map((d) => (
                              <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="py-3 text-cyan-300 font-semibold">#{d.id}</td>
                                <td className="py-3">
                                  {d.status === 'SUCCESS' && (
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> SUCCESS
                                    </span>
                                  )}
                                  {d.status === 'FAILED' && (
                                    <span className="text-red-400 font-bold flex items-center gap-1">
                                      <XCircle className="w-3 h-3" /> FAILED
                                    </span>
                                  )}
                                  {d.status === 'RUNNING' && (
                                    <span className="text-cyan-400 font-bold flex items-center gap-1 animate-pulse">
                                      <Play className="w-3 h-3" /> RUNNING
                                    </span>
                                  )}
                                  {d.status === 'ABORTED' && (
                                    <span className="text-amber-400 font-bold flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" /> ABORTED
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 text-slate-300">{d.triggered_by_username}</td>
                                <td className="py-3 text-slate-400">{new Date(d.started_at).toLocaleString()}</td>
                                <td className="py-3 text-slate-400">
                                  {d.duration_ms ? `${(d.duration_ms / 1000).toFixed(1)}s` : '-'}
                                </td>
                                <td className="py-3 text-right">
                                  <button
                                    onClick={async () => {
                                      const full = await api.getDeployment(d.id);
                                      setActiveDeployment(full);
                                      setShowTerminalDrawer(true);
                                      setProjectDetailTab('logs');
                                    }}
                                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors font-sans text-xs"
                                  >
                                    View Terminal
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {deployHistory.length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                                  No deployment runs recorded yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </main>

      {/* Slide-over / Modal for New/Edit Project */}
      {showProjectModal && (
        <ProjectModal
          project={editingProject}
          onClose={() => setShowProjectModal(false)}
          onSave={handleSaveProject}
        />
      )}

      {/* Live Terminal Modal / Popup */}
      {showTerminalDrawer && activeDeployment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">
            <TerminalViewer
              deploymentId={activeDeployment.id}
              projectName={activeDeployment.project_name || selectedProject?.name || 'Project'}
              status={activeDeployment.status}
              logs={activeDeployment.logs}
              durationMs={activeDeployment.duration_ms}
              onAbort={handleAbortDeploy}
              onClose={() => setShowTerminalDrawer(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
