import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { ExternalLink, Rocket, ArrowUpRight } from 'lucide-react';

const STATUS_CONFIG: Record<string, { class: string; label: string }> = {
  running: { class: 'status-running', label: 'Running' },
  stopped: { class: 'status-stopped', label: 'Stopped' },
  building: { class: 'status-building', label: 'Building' },
  failed: { class: 'status-failed', label: 'Failed' },
};

export function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.projects
      .list()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-[var(--surface)] rounded-lg animate-pulse" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[var(--surface)] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent-2)]/20 flex items-center justify-center mb-6">
          <Rocket size={36} className="text-[var(--accent)]" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No projects yet</h2>
        <p className="text-[var(--text-muted)] mb-8 max-w-md">
          Deploy your first project from a Git repository and watch it go live in seconds.
        </p>
        <Link to="/projects/new" className="btn btn-primary">
          Deploy your first project
          <ArrowUpRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-[var(--text-muted)] mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''} deployed
          </p>
        </div>
        <Link to="/projects/new" className="btn btn-primary">
          New Project
        </Link>
      </div>

      <div className="grid gap-4">
        {projects.map((project, index) => {
          const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.stopped;
          const projectUrl = project.url || `https://${project.subdomain}.openflow.dev`;
          const displayHost = project.url ? new URL(project.url).host : `${project.subdomain}.openflow.dev`;
          return (
            <div
              key={project.id}
              className={`card p-5 animate-fade-in stagger-${Math.min(index + 1, 4)}`}
              style={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between">
                <Link
                  to={`/projects/${project.id}`}
                  className="flex items-center gap-4 flex-1 hover:opacity-80 transition-opacity"
                >
                  <div className={`status-dot ${status.class}`} />
                  <div>
                    <h3 className="font-semibold text-[var(--text)]">{project.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="badge">{project.technology}</span>
                      <span className="text-sm text-[var(--text-muted)]">{status.label}</span>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-4">
                  {project.status === 'running' ? (
                    <a
                      href={projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-mono text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                    >
                      {displayHost}
                      <ExternalLink size={16} />
                    </a>
                  ) : (
                    <span className="text-sm text-[var(--text-muted)]">
                      {project.status === 'building' ? 'Deploying...' : 'Offline'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
