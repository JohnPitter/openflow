import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, createWebSocket } from '../services/api';
import { RefreshCw, Square, Trash2, ExternalLink, GitBranch, Cpu, HardDrive, Wifi, Terminal, Loader2, AlertCircle, X } from 'lucide-react';

const STATUS_CONFIG: Record<string, { class: string; label: string; color: string }> = {
  running: { class: 'status-running', label: 'Running', color: 'text-[var(--success)]' },
  stopped: { class: 'status-stopped', label: 'Stopped', color: 'text-[var(--text-muted)]' },
  building: { class: 'status-building', label: 'Building', color: 'text-[var(--warning)]' },
  failed: { class: 'status-failed', label: 'Failed', color: 'text-[var(--error)]' },
};

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [logs, setLogs] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [redeploying, setRedeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    api.projects
      .get(id)
      .then(setProject)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !project?.containerId || project.status !== 'running') return;

    const ws = createWebSocket(id);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'logs') setLogs(msg.data);
      if (msg.type === 'stats') setStats(msg.data);
    };

    return () => {
      ws.close();
    };
  }, [id, project?.containerId, project?.status]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleRedeploy = async () => {
    if (!id) return;
    setRedeploying(true);
    setProject((p: any) => ({ ...p, status: 'building' }));
    try {
      const result = await api.projects.redeploy(id);
      setProject((p: any) => ({ ...p, ...result }));
    } finally {
      setRedeploying(false);
    }
  };

  const handleStop = async () => {
    if (!id) return;
    await api.projects.stop(id);
    setProject((p: any) => ({ ...p, status: 'stopped' }));
  };

  const handleDelete = async () => {
    if (!id) return;
    setError(null);
    try {
      await api.projects.delete(id);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
      setShowDeleteConfirm(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-10 w-64 bg-[var(--surface)] rounded-lg animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[var(--surface)] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-bold text-[var(--error)]">Project not found</h2>
        <p className="text-[var(--text-muted)] mt-2">This project may have been deleted</p>
      </div>
    );
  }

  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.stopped;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)]">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="card p-6 border-[var(--danger)]/20 bg-[var(--danger)]/5">
          <h3 className="font-semibold text-[var(--danger)] mb-2">Delete Project</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Are you sure you want to delete "{project.name}"? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={handleDelete} className="btn btn-danger">
              Yes, Delete Project
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`status-dot ${status.class}`} />
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <span className="badge">{project.technology}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
            <a
              href={project.url || `https://${project.subdomain}.openflow.dev`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors"
            >
              <ExternalLink size={14} />
              {project.url ? new URL(project.url).host : `${project.subdomain}.openflow.dev`}
            </a>
            <span className="flex items-center gap-1.5">
              <GitBranch size={14} />
              {project.branch}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRedeploy}
            disabled={redeploying}
            className="btn btn-primary"
          >
            {redeploying ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Redeploy
              </>
            )}
          </button>
          <button
            onClick={handleStop}
            disabled={project.status !== 'running'}
            className="btn btn-secondary disabled:opacity-50"
          >
            <Square size={16} />
            Stop
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-danger"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-[var(--text-muted)] mb-1">Status</p>
          <p className={`text-lg font-semibold ${status.color}`}>{status.label}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-[var(--text-muted)] mb-1">Branch</p>
          <p className="text-lg font-mono font-medium">{project.branch}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-[var(--text-muted)] mb-1">URL</p>
          <p className="text-lg font-mono font-medium truncate">
            {project.url ? new URL(project.url).host : `${project.subdomain}.openflow.dev`}
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                <Cpu size={20} className="text-[var(--accent)]" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">CPU Usage</span>
            </div>
            <p className="text-2xl font-bold">{stats.cpuPercent}%</p>
            <div className="mt-2 h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]"
                style={{ width: `${Math.min(stats.cpuPercent, 100)}%` }}
              />
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center">
                <HardDrive size={20} className="text-[var(--success)]" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">Memory</span>
            </div>
            <p className="text-2xl font-bold">{formatBytes(stats.memoryUsage)}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              of {formatBytes(stats.memoryLimit)}
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-2)]/10 flex items-center justify-center">
                <Wifi size={20} className="text-[var(--accent-2)]" />
              </div>
              <span className="text-sm text-[var(--text-muted)]">Network</span>
            </div>
            <div className="flex items-baseline gap-3">
              <div>
                <p className="text-lg font-bold">{formatBytes(stats.networkRx)}</p>
                <p className="text-xs text-[var(--text-muted)]">Received</p>
              </div>
              <span className="text-[var(--text-muted)]">/</span>
              <div>
                <p className="text-lg font-bold">{formatBytes(stats.networkTx)}</p>
                <p className="text-xs text-[var(--text-muted)]">Sent</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Terminal size={18} className="text-[var(--accent)]" />
          <h2 className="text-lg font-semibold">Logs</h2>
        </div>
        <div className="card overflow-hidden">
          <div className="bg-[var(--bg-deep)] p-1">
            <div className="flex items-center gap-1.5 px-3 py-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28ca41]" />
              <span className="flex-1 text-center text-xs text-[var(--text-muted)] font-mono">
                {project.name} — logs
              </span>
            </div>
          </div>
          <pre className="p-4 bg-[var(--bg-deep)] text-sm text-[var(--text-secondary)] font-mono overflow-auto max-h-96 whitespace-pre-wrap leading-relaxed">
            {logs || (
              <span className="text-[var(--text-muted)]">
                {project.status === 'running'
                  ? 'Connecting to logs...'
                  : 'No logs available. Start the container to see logs.'}
              </span>
            )}
            <div ref={logsEndRef} />
          </pre>
        </div>
      </div>
    </div>
  );
}
