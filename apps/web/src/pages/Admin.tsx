import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Cpu, HardDrive, Box, AlertTriangle, Activity, Database } from 'lucide-react';

export function Admin() {
  const [overview, setOverview] = useState<any>(null);
  const [containers, setContainers] = useState<any[]>([]);
  const [databases, setDatabases] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.admin.overview(),
      api.admin.containers(),
      api.admin.databases(),
      api.admin.alerts(),
    ])
      .then(([ov, ct, dbs, al]) => {
        setOverview(ov);
        setContainers(ct);
        setDatabases(dbs);
        setAlerts(al);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-[var(--surface)] rounded-lg animate-pulse" />
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-[var(--surface)] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const memoryPercent = overview?.system.totalMemory
    ? Math.round((overview.system.usedMemory / overview.system.totalMemory) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-[var(--text-muted)] mt-1">System overview and monitoring</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
              <Box size={20} className="text-[var(--accent)]" />
            </div>
            <span className="text-sm text-[var(--text-muted)]">Projects</span>
          </div>
          <p className="text-3xl font-bold">{overview?.projects.total || 0}</p>
          <p className="text-sm text-[var(--success)] mt-1">
            {overview?.projects.running || 0} running
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Database size={20} className="text-blue-400" />
            </div>
            <span className="text-sm text-[var(--text-muted)]">Databases</span>
          </div>
          <p className="text-3xl font-bold">{overview?.databases?.total || 0}</p>
          <p className="text-sm text-[var(--success)] mt-1">
            {overview?.databases?.running || 0} running
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-2)]/10 flex items-center justify-center">
              <Cpu size={20} className="text-[var(--accent-2)]" />
            </div>
            <span className="text-sm text-[var(--text-muted)]">CPU Cores</span>
          </div>
          <p className="text-3xl font-bold">{overview?.system.cpuCount || 0}</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Available</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center">
              <HardDrive size={20} className="text-[var(--success)]" />
            </div>
            <span className="text-sm text-[var(--text-muted)]">Memory</span>
          </div>
          <p className="text-3xl font-bold">
            {formatBytes(overview?.system.totalMemory || 0)}
          </p>
          <div className="mt-2">
            <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--success)] to-[var(--accent)]"
                style={{ width: `${memoryPercent}%` }}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">{memoryPercent}% used</p>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              alerts.length > 0 ? 'bg-[var(--warning)]/10' : 'bg-[var(--surface)]'
            }`}>
              <AlertTriangle size={20} className={alerts.length > 0 ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'} />
            </div>
            <span className="text-sm text-[var(--text-muted)]">Alerts</span>
          </div>
          <p className="text-3xl font-bold">{alerts.length}</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {alerts.length === 0 ? 'All clear' : 'Needs attention'}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle size={18} className="text-[var(--warning)]" />
            Active Alerts
          </h2>
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`card p-4 ${
                  alert.type === 'error'
                    ? 'border-[var(--error)]/30 bg-[var(--error)]/5'
                    : 'border-[var(--warning)]/30 bg-[var(--warning)]/5'
                }`}
              >
                <p className={`text-sm ${
                  alert.type === 'error' ? 'text-[var(--error)]' : 'text-[var(--warning)]'
                }`}>
                  {alert.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Containers table */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity size={18} className="text-[var(--accent)]" />
          Project Containers
        </h2>
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Technology</th>
                <th>Status</th>
                <th>CPU</th>
                <th>Memory</th>
              </tr>
            </thead>
            <tbody>
              {containers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[var(--text-muted)]">
                    No project containers
                  </td>
                </tr>
              ) : (
                containers.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium text-[var(--text)]">{c.technology}</td>
                    <td>
                      <span className={`inline-flex items-center gap-2 ${
                        c.status === 'running' ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'
                      }`}>
                        <span className={`status-dot ${c.status === 'running' ? 'status-running' : 'status-stopped'}`} />
                        {c.status}
                      </span>
                    </td>
                    <td className="font-mono text-sm">
                      {c.currentStats?.cpuPercent ?? '-'}%
                    </td>
                    <td className="font-mono text-sm">
                      {c.currentStats ? formatBytes(c.currentStats.memoryUsage) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Databases table */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database size={18} className="text-blue-400" />
          Database Containers
        </h2>
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Memory</th>
              </tr>
            </thead>
            <tbody>
              {databases.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[var(--text-muted)]">
                    No database containers
                  </td>
                </tr>
              ) : (
                databases.map((db) => (
                  <tr key={db.id}>
                    <td className="font-medium text-[var(--text)]">{db.name}</td>
                    <td>
                      <span className="badge">{db.type}</span>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-2 ${
                        db.status === 'running' ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'
                      }`}>
                        <span className={`status-dot ${db.status === 'running' ? 'status-running' : 'status-stopped'}`} />
                        {db.status}
                      </span>
                    </td>
                    <td className="font-mono text-sm">
                      {db.currentStats ? formatBytes(db.currentStats.memoryUsage) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
