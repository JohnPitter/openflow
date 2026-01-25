import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, createWebSocket } from '../services/api';
import { RefreshCw, Square, Trash2, Circle } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  running: 'text-green-400',
  stopped: 'text-gray-500',
  building: 'text-yellow-400',
  failed: 'text-red-400',
};

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [logs, setLogs] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

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

  const handleRedeploy = async () => {
    if (!id) return;
    setProject((p: any) => ({ ...p, status: 'building' }));
    const result = await api.projects.redeploy(id);
    setProject((p: any) => ({ ...p, ...result }));
  };

  const handleStop = async () => {
    if (!id) return;
    await api.projects.stop(id);
    setProject((p: any) => ({ ...p, status: 'stopped' }));
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this project?')) return;
    await api.projects.delete(id);
    navigate('/dashboard');
  };

  if (loading) return <div className="animate-pulse text-gray-500">Loading...</div>;
  if (!project) return <div className="text-red-400">Project not found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Circle size={10} className={`fill-current ${STATUS_COLORS[project.status]}`} />
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <span className="text-sm text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{project.technology}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRedeploy}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
          >
            <RefreshCw size={14} />
            Redeploy
          </button>
          <button
            onClick={handleStop}
            disabled={project.status !== 'running'}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors disabled:opacity-50"
          >
            <Square size={14} />
            Stop
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-sm transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <p className="text-sm text-gray-500">URL</p>
          <p className="text-sm font-mono mt-1">{project.subdomain}.openflow.dev</p>
        </div>
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <p className="text-sm text-gray-500">Branch</p>
          <p className="text-sm font-mono mt-1">{project.branch}</p>
        </div>
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <p className="text-sm text-gray-500">Status</p>
          <p className={`text-sm font-medium mt-1 ${STATUS_COLORS[project.status]}`}>{project.status}</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <p className="text-sm text-gray-500">CPU</p>
            <p className="text-lg font-bold mt-1">{stats.cpuPercent}%</p>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <p className="text-sm text-gray-500">Memory</p>
            <p className="text-lg font-bold mt-1">
              {Math.round(stats.memoryUsage / 1024 / 1024)}MB / {Math.round(stats.memoryLimit / 1024 / 1024)}MB
            </p>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <p className="text-sm text-gray-500">Network</p>
            <p className="text-lg font-bold mt-1">
              {Math.round(stats.networkRx / 1024)}KB / {Math.round(stats.networkTx / 1024)}KB
            </p>
          </div>
        </div>
      )}

      {/* Logs */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Logs</h2>
        <pre className="p-4 bg-black border border-gray-800 rounded-lg text-xs text-gray-300 font-mono overflow-auto max-h-96 whitespace-pre-wrap">
          {logs || 'No logs available'}
        </pre>
      </div>
    </div>
  );
}
