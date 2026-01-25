import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Database, Trash2, Copy, Plus } from 'lucide-react';

const DB_TYPES = ['postgresql', 'mysql', 'mongodb', 'redis'];

export function Databases() {
  const [databases, setDatabases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newDbType, setNewDbType] = useState('postgresql');
  const [newDbName, setNewDbName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    api.databases
      .list()
      .then(setDatabases)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.databases.create({ type: newDbType, name: newDbName });
      setShowCreate(false);
      setNewDbName('');
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this database? All data will be lost.')) return;
    await api.databases.delete(id);
    load();
  };

  const copyConnection = async (id: string) => {
    const { connectionString } = await api.databases.connection(id);
    navigator.clipboard.writeText(connectionString);
  };

  if (loading) return <div className="animate-pulse text-gray-500">Loading databases...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Databases</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
        >
          <Plus size={14} />
          Add Database
        </button>
      </div>

      {showCreate && (
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg mb-6 space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select
              value={newDbType}
              onChange={(e) => setNewDbType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            >
              {DB_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={newDbName}
              onChange={(e) => setNewDbName(e.target.value)}
              placeholder="my-database"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {databases.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No databases yet</p>
      ) : (
        <div className="space-y-3">
          {databases.map((db) => (
            <div key={db.id} className="p-4 bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-blue-400" />
                <div>
                  <p className="font-medium">{db.name}</p>
                  <p className="text-sm text-gray-500">{db.type} - {db.status}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyConnection(db.id)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Copy connection string"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => handleDelete(db.id)}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
