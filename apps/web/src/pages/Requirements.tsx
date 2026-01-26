import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ArrowRight,
  Server,
  Cpu,
  HardDrive,
  Network,
  Monitor,
  Zap,
} from 'lucide-react';

interface Requirement {
  name: string;
  description: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

const ICONS: Record<string, any> = {
  Docker: Server,
  'Docker Network': Network,
  Memory: HardDrive,
  CPU: Cpu,
  'Disk Space': HardDrive,
  'Operating System': Monitor,
};

export function Requirements() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<'ok' | 'warning' | 'error'>('ok');
  const [message, setMessage] = useState('');
  const [requirements, setRequirements] = useState<Requirement[]>([]);

  const checkRequirements = async () => {
    setChecking(true);
    try {
      const result = await api.health.requirements();
      setStatus(result.status);
      setMessage(result.message);
      setRequirements(result.requirements);
    } catch (error: any) {
      setStatus('error');
      setMessage('Failed to check requirements');
      setRequirements([
        {
          name: 'API Connection',
          description: 'Connection to OpenFlow API',
          status: 'error',
          message: 'Cannot connect to API',
          details: error.message || 'Make sure the API server is running',
        },
      ]);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  useEffect(() => {
    checkRequirements();
  }, []);

  const getStatusIcon = (reqStatus: string) => {
    switch (reqStatus) {
      case 'ok':
        return <CheckCircle size={20} className="text-[var(--success)]" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-[var(--warning)]" />;
      case 'error':
        return <XCircle size={20} className="text-[var(--error)]" />;
      default:
        return null;
    }
  };

  const getStatusColor = (reqStatus: string) => {
    switch (reqStatus) {
      case 'ok':
        return 'border-[var(--success)]/20 bg-[var(--success)]/5';
      case 'warning':
        return 'border-[var(--warning)]/20 bg-[var(--warning)]/5';
      case 'error':
        return 'border-[var(--danger)]/20 bg-[var(--danger)]/5';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center animate-pulse">
              <Zap size={28} className="text-[var(--bg-deep)]" strokeWidth={2.5} />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] blur-xl opacity-30 animate-pulse" />
          </div>
          <p className="mt-4 text-[var(--text-muted)]">Checking system requirements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] mb-4">
            <Zap size={28} className="text-[var(--bg-deep)]" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">System Requirements</h1>
          <p className="text-[var(--text-muted)] mt-2">
            Checking if your system meets the requirements to run OpenFlow
          </p>
        </div>

        {/* Overall Status */}
        <div className={`card p-6 mb-6 ${getStatusColor(status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(status)}
              <div>
                <h2 className="font-semibold">
                  {status === 'ok'
                    ? 'All Requirements Met'
                    : status === 'warning'
                      ? 'Ready with Warnings'
                      : 'Requirements Not Met'}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">{message}</p>
              </div>
            </div>
            <button
              onClick={checkRequirements}
              disabled={checking}
              className="btn btn-secondary"
            >
              {checking ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Recheck
            </button>
          </div>
        </div>

        {/* Requirements List */}
        <div className="space-y-3 mb-8">
          {requirements.map((req, index) => {
            const Icon = ICONS[req.name] || Server;
            return (
              <div
                key={index}
                className={`card p-4 ${getStatusColor(req.status)} animate-fade-in`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--surface)] flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-[var(--text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{req.name}</h3>
                      {getStatusIcon(req.status)}
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">{req.description}</p>
                    <p className="text-sm font-medium mt-1">{req.message}</p>
                    {req.details && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">{req.details}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          {status !== 'error' ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-primary"
            >
              Continue to Dashboard
              <ArrowRight size={16} />
            </button>
          ) : (
            <div className="text-center">
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Please fix the issues above before continuing.
              </p>
              <button
                onClick={() => navigate('/setup')}
                className="btn btn-secondary"
              >
                View Setup Guide
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
