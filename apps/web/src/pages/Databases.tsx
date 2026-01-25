import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Database, Trash2, Copy, Plus, X, Check, Server, AlertCircle } from 'lucide-react';

const DB_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL', color: 'text-blue-400' },
  { value: 'mysql', label: 'MySQL', color: 'text-orange-400' },
  { value: 'mongodb', label: 'MongoDB', color: 'text-green-400' },
  { value: 'redis', label: 'Redis', color: 'text-red-400' },
];

export function Databases() {
  const [databases, setDatabases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newDbType, setNewDbType] = useState('postgresql');
  const [newDbName, setNewDbName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
      await api.databases.create({ type: newDbType, name: newDbName });
      setShowCreate(false);
      setNewDbName('');
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

  const copyConnection = async (id: string) => {
    const { connectionString } = await api.databases.connection(id);
    navigator.clipboard.writeText(connectionString);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
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
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>

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
            return (
              <div
                key={db.id}
                className={`card p-5 animate-fade-in stagger-${Math.min(index + 1, 4)}`}
                style={{ opacity: 0 }}
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
                      onClick={() => copyConnection(db.id)}
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
                      onClick={() => setDeleteConfirm(db.id)}
                      className="btn btn-danger"
                      title="Delete database"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
