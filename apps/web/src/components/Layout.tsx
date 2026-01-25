import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, Database, Shield, LogOut, Plus, Zap } from 'lucide-react';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Projects', icon: LayoutDashboard },
    { path: '/databases', label: 'Databases', icon: Database },
    ...(user?.isAdmin ? [{ path: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <div className="flex h-screen bg-[var(--bg)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--bg-elevated)] border-r border-[var(--border)] flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-[var(--border)]">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center shadow-lg group-hover:shadow-[var(--accent-glow)] transition-shadow">
              <Zap size={18} className="text-[var(--bg-deep)]" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight">OpenFlow</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
                }`}
              >
                <Icon
                  size={18}
                  className={active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]'}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* New Project Button */}
        <div className="p-3 border-t border-[var(--border)]">
          <Link
            to="/projects/new"
            className="btn btn-primary w-full justify-center"
          >
            <Plus size={18} />
            New Project
          </Link>
        </div>

        {/* User section */}
        <div className="p-3 border-t border-[var(--border)]">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface)]">
            <div className="flex items-center gap-2.5 min-w-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full ring-2 ring-[var(--border)]"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center text-sm font-bold text-[var(--bg-deep)]">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-sm font-medium text-[var(--text-secondary)] truncate">
                {user?.username}
              </span>
            </div>
            <button
              onClick={logout}
              className="btn-icon text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
