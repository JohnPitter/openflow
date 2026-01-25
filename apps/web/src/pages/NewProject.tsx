import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { GitBranch, Link as LinkIcon, Github, Rocket, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export function NewProject() {
  const navigate = useNavigate();
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [projectName, setProjectName] = useState('');
  const [branch, setBranch] = useState('main');
  const [devMode, setDevMode] = useState(false);
  const [useManualUrl, setUseManualUrl] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.auth.devMode().then((res) => {
      setDevMode(res.devMode);
      if (res.devMode) {
        setUseManualUrl(true);
        setLoading(false);
      } else {
        api.auth.repos().then(setRepos).finally(() => setLoading(false));
      }
    });
  }, []);

  const handleDeploy = async () => {
    setError(null);
    if (!projectName) return;

    if (useManualUrl && !repoUrl) {
      setError('Please enter a repository URL');
      return;
    }

    if (!useManualUrl && !selectedRepo) {
      setError('Please select a repository');
      return;
    }

    setDeploying(true);
    try {
      const project = await api.projects.create({
        name: projectName,
        repoUrl: useManualUrl ? repoUrl : selectedRepo.cloneUrl,
        branch,
      });
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to deploy project');
      setDeploying(false);
    }
  };

  const handleUrlChange = (url: string) => {
    setRepoUrl(url);
    if (!projectName && url) {
      const match = url.match(/\/([^/]+?)(\.git)?$/);
      if (match) {
        setProjectName(match[1]);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl animate-fade-in">
        <div className="h-8 w-48 bg-[var(--surface)] rounded-lg animate-pulse mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[var(--surface)] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Deploy a Project</h1>
        <p className="text-[var(--text-muted)]">
          Connect a Git repository and deploy it automatically.
        </p>
      </div>

      {/* Source Toggle */}
      {devMode && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setUseManualUrl(true)}
            className={`btn ${useManualUrl ? 'btn-primary' : 'btn-secondary'}`}
          >
            <LinkIcon size={16} />
            Git URL
          </button>
          <button
            onClick={() => {
              setUseManualUrl(false);
              api.auth.repos().then(setRepos);
            }}
            className={`btn ${!useManualUrl ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Github size={16} />
            My Repos
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)]">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Manual URL Mode */}
      {useManualUrl ? (
        <div className="space-y-5">
          <div className="card p-6">
            <div className="space-y-5">
              <div>
                <label className="label">Repository URL</label>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  className="input font-mono text-sm"
                />
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Supports GitHub, GitLab, Bitbucket, or any public Git URL
                </p>
              </div>

              <div>
                <label className="label">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="my-awesome-app"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="input font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleDeploy}
            disabled={deploying || !projectName || !repoUrl}
            className="btn btn-primary w-full"
          >
            {deploying ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Rocket size={18} />
                Deploy Project
              </>
            )}
          </button>
        </div>
      ) : !selectedRepo ? (
        /* GitHub Repo Selection */
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Select a repository to deploy
          </p>
          {repos.map((repo, index) => (
            <button
              key={repo.fullName}
              onClick={() => {
                setSelectedRepo(repo);
                setProjectName(repo.name);
                setBranch(repo.defaultBranch);
              }}
              className={`card card-interactive w-full text-left p-4 animate-fade-in stagger-${Math.min(index + 1, 4)}`}
              style={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Github size={18} className="text-[var(--text-muted)]" />
                  <span className="font-medium">{repo.fullName}</span>
                  {repo.private && (
                    <span className="badge text-[var(--warning)]">Private</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <GitBranch size={14} />
                  {repo.defaultBranch}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* GitHub Repo Configuration */
        <div className="space-y-5">
          <div className="card p-4 bg-[var(--accent)]/5 border-[var(--accent)]/20">
            <div className="flex items-center gap-3">
              <Github size={18} className="text-[var(--accent)]" />
              <div>
                <p className="text-xs text-[var(--text-muted)]">Repository</p>
                <p className="font-medium">{selectedRepo.fullName}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="space-y-5">
              <div>
                <label className="label">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="input font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDeploy}
              disabled={deploying || !projectName}
              className="btn btn-primary flex-1"
            >
              {deploying ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket size={18} />
                  Deploy Project
                </>
              )}
            </button>
            <button
              onClick={() => setSelectedRepo(null)}
              className="btn btn-secondary"
            >
              <ArrowLeft size={18} />
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
