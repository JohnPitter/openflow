import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { GitBranch } from 'lucide-react';

export function NewProject() {
  const navigate = useNavigate();
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [projectName, setProjectName] = useState('');
  const [branch, setBranch] = useState('main');

  useEffect(() => {
    api.auth
      .repos()
      .then(setRepos)
      .finally(() => setLoading(false));
  }, []);

  const handleDeploy = async () => {
    if (!selectedRepo || !projectName) return;
    setDeploying(true);
    try {
      const project = await api.projects.create({
        name: projectName,
        repoUrl: selectedRepo.cloneUrl,
        branch,
      });
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      alert(err.message);
      setDeploying(false);
    }
  };

  if (loading) return <div className="animate-pulse text-gray-500">Loading repositories...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">New Project</h1>

      {!selectedRepo ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-400 mb-4">Select a repository to deploy</p>
          {repos.map((repo) => (
            <button
              key={repo.fullName}
              onClick={() => {
                setSelectedRepo(repo);
                setProjectName(repo.name);
                setBranch(repo.defaultBranch);
              }}
              className="w-full text-left p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{repo.fullName}</span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <GitBranch size={12} />
                  {repo.defaultBranch}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg">
            <p className="text-sm text-gray-500">Repository</p>
            <p className="font-medium">{selectedRepo.fullName}</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Branch</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDeploy}
              disabled={deploying || !projectName}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {deploying ? 'Deploying...' : 'Deploy'}
            </button>
            <button
              onClick={() => setSelectedRepo(null)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
