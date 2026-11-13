import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Tags,
  ClipboardList,
  Users,
  Settings,
  Languages,
  ArrowUpRight,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import BrandLogo from '../BrandLogo';
import { useAuth } from '@/context/AuthContext';

const navigation = [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Laws & Lessons', path: '/admin/laws', icon: BookOpen },
  { label: 'Categories', path: '/admin/categories', icon: Tags },
  { label: 'Assessments', path: '/admin/assessments', icon: ClipboardList },
  { label: 'Certification', path: '/admin/certification', icon: ClipboardList },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
  { label: 'Languages', path: '/admin/languages', icon: Languages },
];

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName =
    profile?.full_name?.trim() || user?.email || 'Administrator';

  const initials = displayName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  async function handleSignOut() {
    setLogoutError('');
    setSigningOut(true);

    try {
      const result = await signOut();

      if (result.error) {
        setLogoutError(result.error);
        return;
      }

      navigate('/login', { replace: true });
    } catch {
      setLogoutError('Unable to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center justify-between border-b border-line px-6">
        <Link to="/admin" className="flex items-center gap-3">
          <BrandLogo variant="sidebar" className="h-14 w-28" />
          <span className="sr-only">POWERLAB</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Administration
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded p-2 text-ink-muted hover:bg-canvas-2 lg:hidden"
          aria-label="Close navigation"
        >
          <X size={19} />
        </button>
      </div>

      <div className="px-5 pb-3 pt-8">
        <p className="eyebrow px-3">Workspace</p>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-sm px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-forest-50 text-forest-700'
                    : 'text-ink-muted hover:bg-canvas-2 hover:text-ink'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-line p-5">
        <Link
          to="/"
          className="flex items-center justify-between rounded-sm px-3 py-3 text-sm text-ink-muted transition-colors hover:bg-canvas-2 hover:text-forest-700"
        >
          <span>View public website</span>
          <ArrowUpRight size={16} />
        </Link>

        <div className="mt-4 border-t border-line pt-4">
          <p className="truncate text-xs font-semibold text-ink">
            {displayName}
          </p>
          <p className="mt-1 text-[10px] text-ink-muted">
            Authenticated administrator
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="mt-3 flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-ink-muted transition-colors hover:bg-canvas-2 hover:text-error disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut size={16} />
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>

          {logoutError && (
            <p role="alert" className="mt-2 break-words text-xs text-error">
              {logoutError}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-surface lg:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(19rem,85vw)] bg-surface shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-sm p-2 text-ink-muted hover:bg-canvas-2 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-sm font-semibold text-ink">
                Content management
              </p>
              <p className="hidden text-xs text-ink-muted sm:block">
                Manage your POWERLAB learning platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-forest-200 bg-forest-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-forest-700 sm:inline-flex">
              Administrator access
            </span>

            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-100 text-sm font-semibold text-forest-700"
              title={displayName}
              aria-label={`Signed in as ${displayName}`}
            >
              {initials || 'A'}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] p-5 sm:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
