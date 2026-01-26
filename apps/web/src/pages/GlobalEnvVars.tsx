import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Settings, Plus, Trash2, Eye, EyeOff, Save, Check, Loader2, AlertCircle, X, Globe } from 'lucide-react';

export function GlobalEnvVars() {
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [showEnvValues, setShowEnvValues] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.settings
      .getEnv()
      .then(({ envVars: vars }) => {
        const envArray = Object.entries(vars).map(([key, value]) => ({
          key,
          value: value as string,
        }));
        setEnvVars(envArray);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load environment variables');
      })
      .finally(() => setLoading(false));
  }, []);

  const addEnvVar = () => {
    if (!newEnvKey.trim()) return;
    if (envVars.some((env) => env.key === newEnvKey.trim())) {
      setError(`Variable "${newEnvKey}" already exists`);
      return;
    }
    setEnvVars([...envVars, { key: newEnvKey.trim(), value: newEnvValue }]);
    setNewEnvKey('');
    setNewEnvValue('');
    setDirty(true);
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...envVars];
    updated[index] = { ...updated[index], [field]: value };
    setEnvVars(updated);
    setDirty(true);
  };

  const deleteEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
    setDirty(true);
  };

  const saveEnvVars = async () => {
    setSaving(true);
    setError(null);
    try {
      const envObject = envVars.reduce(
        (acc, { key, value }) => {
          if (key.trim()) acc[key.trim()] = value;
          return acc;
        },
        {} as Record<string, string>
      );
      await api.settings.updateEnv(envObject);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save environment variables');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnvVisibility = (key: string) => {
    setShowEnvValues((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-[var(--surface)] rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-[var(--surface)] rounded-lg animate-pulse" />
        </div>
        <div className="h-64 bg-[var(--surface)] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Global Environment Variables</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Variables available to all projects during deployment
          </p>
        </div>
        <button
          onClick={saveEnvVars}
          disabled={saving || !dirty}
          className="btn btn-primary disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check size={16} className="text-[var(--success)]" />
              Saved!
            </>
          ) : (
            <>
              <Save size={16} />
              Save Changes
            </>
          )}
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

      {/* Unsaved changes indicator */}
      {dirty && (
        <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-[var(--warning)]">
          <AlertCircle size={16} />
          <span className="text-sm">You have unsaved changes</span>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
            <Globe size={20} className="text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="font-semibold">Environment Variables</h2>
            <p className="text-sm text-[var(--text-muted)]">
              {envVars.length} variable{envVars.length !== 1 ? 's' : ''} configured
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Existing env vars */}
          {envVars.length > 0 && (
            <div className="space-y-3">
              {envVars.map((env, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={env.key}
                    onChange={(e) => updateEnvVar(index, 'key', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                    placeholder="KEY"
                    className="input font-mono text-sm flex-1"
                  />
                  <span className="text-[var(--text-muted)]">=</span>
                  <div className="flex-[2] relative">
                    <input
                      type={showEnvValues[env.key] ? 'text' : 'password'}
                      value={env.value}
                      onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                      placeholder="value"
                      className="input font-mono text-sm w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleEnvVisibility(env.key)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--surface)] rounded"
                    >
                      {showEnvValues[env.key] ? (
                        <EyeOff size={16} className="text-[var(--text-muted)]" />
                      ) : (
                        <Eye size={16} className="text-[var(--text-muted)]" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => deleteEnvVar(index)}
                    className="p-2 hover:bg-[var(--danger)]/10 rounded-lg text-[var(--danger)] transition-colors"
                    title="Delete variable"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new env var */}
          <div className={`flex items-center gap-3 ${envVars.length > 0 ? 'pt-4 border-t border-[var(--border)]' : ''}`}>
            <input
              type="text"
              value={newEnvKey}
              onChange={(e) => setNewEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
              placeholder="NEW_VARIABLE"
              className="input font-mono text-sm flex-1"
              onKeyDown={(e) => e.key === 'Enter' && addEnvVar()}
            />
            <span className="text-[var(--text-muted)]">=</span>
            <input
              type="text"
              value={newEnvValue}
              onChange={(e) => setNewEnvValue(e.target.value)}
              placeholder="value"
              className="input font-mono text-sm flex-[2]"
              onKeyDown={(e) => e.key === 'Enter' && addEnvVar()}
            />
            <button
              onClick={addEnvVar}
              disabled={!newEnvKey.trim()}
              className="btn btn-secondary disabled:opacity-50"
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          {envVars.length === 0 && !newEnvKey && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--surface)] flex items-center justify-center mb-4">
                <Settings size={28} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-medium mb-2">No global variables</h3>
              <p className="text-[var(--text-muted)] mb-4 max-w-md">
                Global environment variables are available to all projects. Add common configuration like API keys or shared secrets.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-[var(--surface)]">
          <h3 className="text-sm font-medium mb-2">How it works</h3>
          <ul className="text-sm text-[var(--text-muted)] space-y-1.5">
            <li>• Global variables are injected into all project containers</li>
            <li>• Project-specific variables override global variables with the same name</li>
            <li>• Changes take effect on the next deployment of each project</li>
            <li>• Use for shared configuration like API endpoints or common secrets</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
