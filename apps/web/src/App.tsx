import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Home } from './pages/Home';
import { AuthCallback } from './pages/AuthCallback';
import { Dashboard } from './pages/Dashboard';
import { ProjectDetail } from './pages/ProjectDetail';
import { NewProject } from './pages/NewProject';
import { Databases } from './pages/Databases';
import { GlobalEnvVars } from './pages/GlobalEnvVars';
import { Admin } from './pages/Admin';
import { Layout } from './components/Layout';
import { Zap } from 'lucide-react';

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[var(--bg)]">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center animate-pulse">
            <Zap size={28} className="text-[var(--bg-deep)]" strokeWidth={2.5} />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] blur-xl opacity-30 animate-pulse" />
        </div>
        <p className="mt-4 text-sm text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route element={user ? <Layout /> : <Navigate to="/" />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/databases" element={<Databases />} />
        <Route path="/settings/env" element={<GlobalEnvVars />} />
        <Route path="/admin" element={user?.isAdmin ? <Admin /> : <Navigate to="/dashboard" />} />
      </Route>
    </Routes>
  );
}
