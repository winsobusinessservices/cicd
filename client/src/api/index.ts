const API_BASE = '/api';

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'MAIN_ADMIN' | 'SUB_ADMIN';
  isApproved: boolean;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

export interface PipelineStep {
  id?: number;
  step_order?: number;
  name: string;
  command: string;
  working_dir?: string;
  is_enabled: boolean;
  continue_on_error: boolean;
}

export interface ProjectServiceItem {
  id?: number;
  project_id?: number;
  name: string;
  log_command: string;
  working_dir?: string;
  color?: string;
  display_order?: number;
  status?: 'STREAMING' | 'STOPPED' | 'ERROR';
  startedAt?: string | null;
}

export interface Project {
  id: number;
  name: string;
  slug: string;
  description: string;
  project_path: string;
  env_vars: Record<string, string>;
  env_file_path?: string;
  env_file_exists?: boolean;
  env_file_mtime?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  step_count?: number;
  service_count?: number;
  last_deploy_status?: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'ABORTED' | null;
  last_deploy_at?: string | null;
  steps?: PipelineStep[];
  services?: ProjectServiceItem[];
}

export interface Deployment {
  id: number;
  project_id: number;
  project_name: string;
  triggered_by_user_id: number;
  triggered_by_username: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'ABORTED';
  started_at: string;
  finished_at: string | null;
  duration_ms: number;
  exit_code: number | null;
  logs: string;
  error_message: string | null;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  user_id: number | null;
  username: string;
  user_role: string;
  ip_address: string;
  action: string;
  target: string;
  details: string;
}

let cachedToken: string | null = localStorage.getItem('varex_token');

export function setAuthToken(token: string | null) {
  cachedToken = token;
  if (token) {
    localStorage.setItem('varex_token', token);
  } else {
    localStorage.removeItem('varex_token');
  }
}

export function getAuthToken(): string | null {
  return cachedToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (cachedToken) {
    headers['Authorization'] = `Bearer ${cachedToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      setAuthToken(null);
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Authentication
  login: (credentials: { username: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (data: { username: string; name: string; email: string; password: string }) =>
    request<{ message: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => request<{ user: User }>('/auth/me'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ message: string }>('/auth/logout', { method: 'POST' }).finally(() => {
      setAuthToken(null);
    }),

  // Projects
  getProjects: () => request<Project[]>('/projects'),

  getProject: (id: number) => request<Project>(`/projects/${id}`),

  createProject: (data: {
    name: string;
    description?: string;
    project_path: string;
    env_vars?: Record<string, string>;
    steps?: PipelineStep[];
  }) =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProject: (id: number, data: {
    name?: string;
    description?: string;
    project_path?: string;
    env_vars?: Record<string, string>;
    sudoPassword?: string;
  }) =>
    request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateProjectEnv: (id: number, data: {
    env_vars: Record<string, string>;
    sudoPassword?: string;
  }) =>
    request<{ message: string; project: Project }>(`/projects/${id}/env`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  syncProjectEnv: (id: number) =>
    request<{ message: string; project: Project }>(`/projects/${id}/env/sync`, {
      method: 'POST',
    }),

  deleteProject: (id: number) =>
    request<{ message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    }),

  saveSteps: (projectId: number, steps: PipelineStep[]) =>
    request<{ message: string; steps: PipelineStep[] }>(`/projects/${projectId}/steps`, {
      method: 'PUT',
      body: JSON.stringify({ steps }),
    }),

  // Project Services (Multi-container & Docker Compose Live Logs)
  getProjectServices: (projectId: number) =>
    request<ProjectServiceItem[]>(`/projects/${projectId}/services`),

  saveProjectServices: (projectId: number, services: ProjectServiceItem[]) =>
    request<{ message: string; services: ProjectServiceItem[] }>(`/projects/${projectId}/services`, {
      method: 'PUT',
      body: JSON.stringify({ services }),
    }),

  startServiceLog: (projectId: number, serviceId: number) =>
    request<{ status: 'STREAMING' | 'STOPPED' | 'ERROR'; logs: string; command: string }>(
      `/projects/${projectId}/services/${serviceId}/start`,
      { method: 'POST' }
    ),

  stopServiceLog: (projectId: number, serviceId: number) =>
    request<{ status: string; message: string }>(
      `/projects/${projectId}/services/${serviceId}/stop`,
      { method: 'POST' }
    ),

  getServiceLogs: (projectId: number, serviceId: number) =>
    request<{ status: 'STREAMING' | 'STOPPED' | 'ERROR'; logs: string; command: string; startedAt: string | null }>(
      `/projects/${projectId}/services/${serviceId}/logs`
    ),

  clearServiceLogs: (projectId: number, serviceId: number) =>
    request<{ message: string }>(`/projects/${projectId}/services/${serviceId}/clear`, {
      method: 'POST',
    }),

  // Deployments
  triggerDeploy: (projectId: number) =>
    request<{ message: string; deployment: Deployment }>(`/deploy/project/${projectId}`, {
      method: 'POST',
    }),

  abortDeploy: (deploymentId: number) =>
    request<{ message: string }>(`/deploy/${deploymentId}/abort`, {
      method: 'POST',
    }),

  getDeployment: (deploymentId: number) =>
    request<Deployment>(`/deploy/${deploymentId}`),

  getDeployHistory: (projectId: number, limit = 25) =>
    request<Deployment[]>(`/deploy/project/${projectId}/history?limit=${limit}`),

  // User Management (Main Admin only)
  getPendingUsers: () => request<User[]>('/users/pending'),

  getAllUsers: () => request<User[]>('/users'),

  approveUser: (userId: number, role: 'SUB_ADMIN' | 'MAIN_ADMIN' = 'SUB_ADMIN') =>
    request<{ message: string; user: User }>(`/users/${userId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  rejectUser: (userId: number) =>
    request<{ message: string }>(`/users/${userId}/reject`, {
      method: 'POST',
    }),

  updateUserRole: (userId: number, role: 'SUB_ADMIN' | 'MAIN_ADMIN') =>
    request<{ message: string; user: User }>(`/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  createApprovedUser: (data: {
    username: string;
    name: string;
    email: string;
    password: string;
    role: 'SUB_ADMIN' | 'MAIN_ADMIN';
  }) =>
    request<{ message: string; user: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteUser: (userId: number) =>
    request<{ message: string }>(`/users/${userId}`, {
      method: 'DELETE',
    }),

  // Audit Logs
  getAuditLogs: (params: { limit?: number; offset?: number; username?: string; action?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.offset) query.set('offset', params.offset.toString());
    if (params.username) query.set('username', params.username);
    if (params.action) query.set('action', params.action);
    return request<{ total: number; limit: number; offset: number; logs: AuditLog[] }>(`/audit?${query.toString()}`);
  },

  getRawAuditLogUrl: () => `${API_BASE}/audit/download?token=${cachedToken || ''}`,
};
