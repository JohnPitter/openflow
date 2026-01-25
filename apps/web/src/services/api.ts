const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('openflow_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  auth: {
    me: () => request<any>('/auth/me'),
    repos: () => request<any[]>('/auth/repos'),
  },

  projects: {
    list: () => request<any[]>('/projects'),
    get: (id: string) => request<any>(`/projects/${id}`),
    create: (data: { name: string; repoUrl: string; branch: string }) =>
      request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    redeploy: (id: string) => request<any>(`/projects/${id}/redeploy`, { method: 'POST' }),
    stop: (id: string) => request<any>(`/projects/${id}/stop`, { method: 'POST' }),
    delete: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
    updateEnv: (id: string, envVars: Record<string, string>) =>
      request<any>(`/projects/${id}/env`, { method: 'PUT', body: JSON.stringify({ envVars }) }),
    deployments: (id: string) => request<any[]>(`/projects/${id}/deployments`),
  },

  databases: {
    list: () => request<any[]>('/databases'),
    create: (data: { type: string; name: string; projectId?: string }) =>
      request<any>('/databases', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/databases/${id}`, { method: 'DELETE' }),
    connection: (id: string) => request<any>(`/databases/${id}/connection`),
  },

  metrics: {
    get: (projectId: string) => request<any>(`/metrics/${projectId}`),
    logs: (projectId: string, tail = 100) => request<any>(`/metrics/${projectId}/logs?tail=${tail}`),
  },

  admin: {
    overview: () => request<any>('/admin/overview'),
    containers: () => request<any[]>('/admin/containers'),
    alerts: () => request<any[]>('/admin/alerts'),
    userCount: () => request<{ count: number }>('/admin/users/count'),
  },
};

export function createWebSocket(projectId: string): WebSocket {
  const token = getToken();
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return new WebSocket(`${protocol}//${window.location.host}/ws/logs/${projectId}?token=${token}`);
}
