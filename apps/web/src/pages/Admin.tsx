import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Cpu, HardDrive, Users, AlertTriangle } from 'lucide-react';

export function Admin() {
  const [overview, setOverview] = useState<any>(null);
  const [containers, setContainers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.admin.overview(), api.admin.containers(), api.admin.alerts()])
      .then(([ov, ct, al]) => {
        setOverview(ov);
        setContainers(ct);
        setAlerts(al);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse text-gray-500">Loading admin panel...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <HardDrive size={14} />
            Total Projects
          </div>
          <p className="text-2xl font-bold">{overview?.projects.total || 0}</p>
          <p className="text-xs text-green-400 mt-1">{overview?.projects.running || 0} running</p>
        </div>
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Cpu size={14} />
            CPUs
          </div>
          <p className="text-2xl font-bold">{overview?.system.cpuCount || 0}</p>
        </div>
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <HardDrive size={14} />
            Memory
          </div>
          <p className="text-2xl font-bold">
            {Math.round((overview?.system.totalMemory || 0) / 1024 / 1024 / 1024)}GB
          </p>
        </div>
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <AlertTriangle size={14} />
            Alerts
          </div>
          <p className="text-2xl font-bold">{alerts.length}</p>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Alerts</h2>
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border text-sm ${
                alert.type === 'error'
                  ? 'bg-red-900/20 border-red-800 text-red-300'
                  : 'bg-yellow-900/20 border-yellow-800 text-yellow-300'
              }`}
            >
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Containers table (privacy-safe) */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Containers</h2>
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left px-4 py-2 text-gray-400 font-medium">Technology</th>
                <th className="text-left px-4 py-2 text-gray-400 font-medium">Status</th>
                <th className="text-left px-4 py-2 text-gray-400 font-medium">CPU</th>
                <th className="text-left px-4 py-2 text-gray-400 font-medium">Memory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {containers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-900/50">
                  <td className="px-4 py-2">{c.technology}</td>
                  <td className="px-4 py-2">
                    <span className={`${c.status === 'running' ? 'text-green-400' : 'text-gray-500'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{c.currentStats?.cpuPercent ?? '-'}%</td>
                  <td className="px-4 py-2">
                    {c.currentStats ? `${Math.round(c.currentStats.memoryUsage / 1024 / 1024)}MB` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
