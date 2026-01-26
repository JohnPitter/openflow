import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Database, Trash2, Copy, Plus, X, Check, Server, AlertCircle, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

const DB_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL', color: 'text-blue-400' },
  { value: 'mysql', label: 'MySQL', color: 'text-orange-400' },
  { value: 'mongodb', label: 'MongoDB', color: 'text-green-400' },
  { value: 'redis', label: 'Redis', color: 'text-red-400' },
];

interface ConnectionInfo {
  connectionString: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export function Databases() {
  const [databases, setDatabases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newDbType, setNewDbType] = useState('postgresql');
  const [newDbName, setNewDbName] = useState('');
  const [newDbUsername, setNewDbUsername] = useState('');
  const [newDbPassword, setNewDbPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedDb, setExpandedDb] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<Record<string, ConnectionInfo>>({});
  const [showPassword, setShowPassword] = useState<string | null>(null);

  const load = () => {
    api.databases
      .list()
      .then(setDatabases)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    if (!newDbName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.databases.create({
        type: newDbType,
        name: newDbName,
        username: newDbUsername || undefined,
        password: newDbPassword || undefined,
      });
      setShowCreate(false);
      setNewDbName('');
      setNewDbUsername('');
      setNewDbPassword('');
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to create database');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await api.databases.delete(id);
      setDeleteConfirm(null);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to delete database');
    }
  };

  const copyConnection = async (id: string, text?: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
    } else {
      const { connectionString } = await api.databases.connection(id);
      navigator.clipboard.writeText(connectionString);
    }
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleExpand = async (id: string) => {
    if (expandedDb === id) {
      setExpandedDb(null);
      return;
    }

    setExpandedDb(id);

    // Fetch connection info if not cached
    if (!connectionInfo[id]) {
      try {
        const info = await api.databases.connection(id);
        setConnectionInfo(prev => ({ ...prev, [id]: info }));
      } catch (err) {
        console.error('Failed to fetch connection info:', err);
      }
    }
  };

  const getDbConfig = (type: string) => DB_TYPES.find(t => t.value === type) || DB_TYPES[0];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-[var(--surface)] rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-[var(--surface)] rounded-lg animate-pulse" />
        </div>
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-[var(--surface)] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Databases</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Managed database instances for your projects
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn btn-primary"
        >
          <Plus size={18} />
          Add Database
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)]">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="card p-6 mb-6 border-[var(--danger)]/20 bg-[var(--danger)]/5">
          <h3 className="font-semibold text-[var(--danger)] mb-2">Delete Database</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Are you sure you want to delete this database? All data will be permanently lost.
          </p>
          <div className="flex gap-3">
            <button onClick={() => handleDelete(deleteConfirm)} className="btn btn-danger">
              Yes, Delete
            </button>
            <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="card p-6 mb-6 border-[var(--accent)]/20 bg-[var(--accent)]/5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold">Create New Database</h3>
            <button
              onClick={() => setShowCreate(false)}
              className="btn-icon text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Database Type</label>
              <div className="grid grid-cols-4 gap-2">
                {DB_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setNewDbType(type.value)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                      newDbType === type.value
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Database Name</label>
              <input
                type="text"
                value={newDbName}
                onChange={(e) => setNewDbName(e.target.value)}
                placeholder="my-database"
                className="input"
              />
            </div>

            {newDbType !== 'redis' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Username <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={newDbUsername}
                    onChange={(e) => setNewDbUsername(e.target.value)}
                    placeholder="Leave empty for auto-generated"
                    className="input font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="label">Password <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newDbPassword}
                      onChange={(e) => setNewDbPassword(e.target.value)}
                      placeholder="Leave empty for auto-generated"
                      className="input font-mono text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--surface)] rounded"
                    >
                      {showNewPassword ? (
                        <EyeOff size={16} className="text-[var(--text-muted)]" />
                      ) : (
                        <Eye size={16} className="text-[var(--text-muted)]" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {newDbType === 'redis' && (
              <div>
                <label className="label">Password <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newDbPassword}
                    onChange={(e) => setNewDbPassword(e.target.value)}
                    placeholder="Leave empty for auto-generated"
                    className="input font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--surface)] rounded"
                  >
                    {showNewPassword ? (
                      <EyeOff size={16} className="text-[var(--text-muted)]" />
                    ) : (
                      <Eye size={16} className="text-[var(--text-muted)]" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">Redis uses password-only authentication</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={creating || !newDbName.trim()}
                className="btn btn-primary"
              >
                {creating ? 'Creating...' : 'Create Database'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Database List */}
      {databases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--surface)] flex items-center justify-center mb-4">
            <Server size={28} className="text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-medium mb-2">No databases yet</h3>
          <p className="text-[var(--text-muted)] mb-6 max-w-md">
            Create a managed database instance for your projects
          </p>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary">
            <Plus size={18} />
            Create your first database
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {databases.map((db, index) => {
            const dbConfig = getDbConfig(db.type);
            const isExpanded = expandedDb === db.id;
            const connInfo = connectionInfo[db.id];

            return (
              <div
                key={db.id}
                className={`card animate-fade-in stagger-${Math.min(index + 1, 4)}`}
                style={{ opacity: 0 }}
              >
                <div
                  className="p-5 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors rounded-t-xl"
                  onClick={() => toggleExpand(db.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg bg-[var(--surface)] flex items-center justify-center`}>
                        <Database size={20} className={dbConfig.color} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--text)]">{db.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="badge">{dbConfig.label}</span>
                          <span className={`text-sm ${
                            db.status === 'running' ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'
                          }`}>
                            {db.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); copyConnection(db.id); }}
                        className="btn btn-secondary"
                        title="Copy connection string"
                      >
                        {copied === db.id ? (
                          <>
                            <Check size={16} className="text-[var(--success)]" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            Connection
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(db.id); }}
                        className="btn btn-danger"
                        title="Delete database"
                      >
                        <Trash2 size={16} />
                      </button>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-[var(--border)] p-5 bg-[var(--bg-elevated)]">
                    {connInfo ? (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-[var(--text-muted)] mb-3">Connection Details</h4>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-[var(--text-muted)]">Host</label>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-sm font-mono bg-[var(--surface)] px-2 py-1 rounded flex-1">
                                {connInfo.host}
                              </code>
                              <button
                                onClick={() => { navigator.clipboard.writeText(connInfo.host); setCopied(`${db.id}-host`); setTimeout(() => setCopied(null), 2000); }}
                                className="p-1.5 hover:bg-[var(--surface)] rounded"
                              >
                                {copied === `${db.id}-host` ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs text-[var(--text-muted)]">Port</label>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-sm font-mono bg-[var(--surface)] px-2 py-1 rounded flex-1">
                                {connInfo.port}
                              </code>
                              <button
                                onClick={() => { navigator.clipboard.writeText(String(connInfo.port)); setCopied(`${db.id}-port`); setTimeout(() => setCopied(null), 2000); }}
                                className="p-1.5 hover:bg-[var(--surface)] rounded"
                              >
                                {copied === `${db.id}-port` ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs text-[var(--text-muted)]">Username</label>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-sm font-mono bg-[var(--surface)] px-2 py-1 rounded flex-1">
                                {connInfo.username}
                              </code>
                              <button
                                onClick={() => { navigator.clipboard.writeText(connInfo.username); setCopied(`${db.id}-user`); setTimeout(() => setCopied(null), 2000); }}
                                className="p-1.5 hover:bg-[var(--surface)] rounded"
                              >
                                {copied === `${db.id}-user` ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs text-[var(--text-muted)]">Password</label>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-sm font-mono bg-[var(--surface)] px-2 py-1 rounded flex-1">
                                {showPassword === db.id ? connInfo.password : '••••••••••••'}
                              </code>
                              <button
                                onClick={() => setShowPassword(showPassword === db.id ? null : db.id)}
                                className="p-1.5 hover:bg-[var(--surface)] rounded"
                              >
                                {showPassword === db.id ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                              <button
                                onClick={() => { navigator.clipboard.writeText(connInfo.password); setCopied(`${db.id}-pass`); setTimeout(() => setCopied(null), 2000); }}
                                className="p-1.5 hover:bg-[var(--surface)] rounded"
                              >
                                {copied === `${db.id}-pass` ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-[var(--text-muted)]">Database</label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-sm font-mono bg-[var(--surface)] px-2 py-1 rounded flex-1">
                              {connInfo.database}
                            </code>
                            <button
                              onClick={() => { navigator.clipboard.writeText(connInfo.database); setCopied(`${db.id}-db`); setTimeout(() => setCopied(null), 2000); }}
                              className="p-1.5 hover:bg-[var(--surface)] rounded"
                            >
                              {copied === `${db.id}-db` ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-[var(--text-muted)]">Connection String</label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-sm font-mono bg-[var(--surface)] px-2 py-1 rounded flex-1 truncate">
                              {connInfo.connectionString}
                            </code>
                            <button
                              onClick={() => copyConnection(db.id, connInfo.connectionString)}
                              className="p-1.5 hover:bg-[var(--surface)] rounded"
                            >
                              {copied === db.id ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-[var(--text-muted)] py-4">
                        Loading connection details...
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
