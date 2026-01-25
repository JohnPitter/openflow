import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Circle, ExternalLink } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  running: 'text-green-400',
  stopped: 'text-gray-500',
  building: 'text-yellow-400',
  failed: 'text-red-400',
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
    return <div className="animate-pulse text-gray-500">Loading projects...</div>;
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl text-gray-400 mb-4">No projects yet</h2>
        <Link
          to="/projects/new"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
        >
          Deploy your first project
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Projects</h1>
      <div className="grid gap-4">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="block p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Circle size={10} className={`fill-current ${STATUS_COLORS[project.status]}`} />
                <div>
                  <h3 className="font-medium">{project.name}</h3>
                  <p className="text-sm text-gray-500">{project.technology}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{project.subdomain}.openflow.dev</span>
                <ExternalLink size={14} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
