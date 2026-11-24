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
  GraduationCap,
  Award,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import BrandLogo from './BrandLogo';
import { useAuth } from '@/context/AuthContext';

import { useLanguage } from '@/context/LanguageContext';

const adminNavigation = [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Laws & Lessons', path: '/admin/laws', icon: BookOpen },
  { label: 'Categories', path: '/admin/categories', icon: Tags },
  { label: 'Assessments', path: '/admin/assessments', icon: ClipboardList },
  { label: 'Certification', path: '/admin/certification', icon: ClipboardList },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
  { label: 'Languages', path: '/admin/languages', icon: Languages },
];

const studentNavigation = [
  { label: 'Overview', bn: 'সংক্ষিপ্ত বিবরণ', path: '/student', icon: LayoutDashboard, end: true },
  { label: 'Learning review', bn: 'শেখার পর্যালোচনা', path: '/student/review', icon: GraduationCap },
  { label: 'Explore 48 Laws', bn: '৪৮টি নিয়ম দেখুন', path: '/laws', icon: BookOpen },
  { label: 'Assessments', bn: 'মূল্যায়ন', path: '/assessments', icon: ClipboardList },
  { label: 'Certification', bn: 'সার্টিফিকেশন', path: '/certification', icon: Award },
];

export default function WorkspaceLayout({ role }: { role: 'admin' | 'student' }) {
  const admin = role === 'admin';
  const { language, languages, setLanguage, t } = useLanguage();
  const navigation = admin
    ? adminNavigation
    : studentNavigation.map((item) => ({ ...item, label: t(item.label, item.bn) }));
  const label = (en: string, bn: string) => admin ? en : t(en, bn);
  const workspace = admin ? 'Content management' : t('Student workspace', 'শিক্ষার্থী কর্মক্ষেত্র');
  const account = admin ? 'Administrator access' : t('Student account', 'শিক্ষার্থী অ্যাকাউন্ট');
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) drawer.current?.close(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName =
    profile?.full_name?.trim() || user?.email || (admin ? 'Administrator' : t('Student', 'শিক্ষার্থী'));

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
      setLogoutError(label('Unable to sign out. Please try again.', 'সাইন আউট করা যায়নি। আবার চেষ্টা করুন।'));
    } finally {
      setSigningOut(false);
    }
  }

  const sidebar = (mobile: boolean) => (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex h-20 items-center justify-between border-b border-line px-6">
        <Link to={admin ? "/admin" : "/student"} onClick={() => drawer.current?.close()} className="flex min-w-0 items-center gap-2" aria-label={`POWERLAB · ${workspace}`}>
          <BrandLogo variant="sidebar" className="h-14 w-28" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {admin ? 'Administration' : t('Learning', 'শেখা')}
          </span>
        </Link>

        {mobile && <button
          type="button"
          onClick={() => drawer.current?.close()}
          className="shrink-0 rounded p-2 text-ink-muted hover:bg-canvas-2"
          aria-label={label('Close navigation', 'নেভিগেশন বন্ধ করুন')}
        >
          <X size={19} />
        </button>}
      </div>

      <div className="px-5 pb-3 pt-8">
        <p className="eyebrow px-3">{label('Workspace', 'কর্মক্ষেত্র')}</p>
      </div>

      <nav aria-label={workspace} className="flex-1 space-y-1 px-4">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => drawer.current?.close()}
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
          onClick={() => drawer.current?.close()}
          className="flex items-center justify-between rounded-sm px-3 py-3 text-sm text-ink-muted transition-colors hover:bg-canvas-2 hover:text-forest-700"
        >
          <span>{label('View public website', 'মূল ওয়েবসাইট দেখুন')}</span>
          <ArrowUpRight size={16} />
        </Link>

        <div className="mt-4 border-t border-line pt-4">
          <p className="truncate text-xs font-semibold text-ink">
            {displayName}
          </p>
          <p className="mt-1 text-[10px] text-ink-muted">
            {account}
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="mt-3 flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-ink-muted transition-colors hover:bg-canvas-2 hover:text-error disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut size={16} />
            {signingOut ? label('Signing out...', 'সাইন আউট হচ্ছে...') : label('Sign out', 'সাইন আউট')}
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
      <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-50 focus:bg-surface focus:p-3">{label('Skip to content', 'মূল বিষয়বস্তুতে যান')}</a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-surface lg:block">
        {sidebar(false)}
      </aside>

      <dialog
        ref={drawer}
        id="workspace-navigation"
        aria-label={workspace}
        onClick={(event) => { if (event.target === event.currentTarget) drawer.current?.close(); }}
        className="fixed inset-y-0 left-0 right-auto m-0 h-full max-h-none w-[min(19rem,85vw)] max-w-none bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        {sidebar(true)}
      </dialog>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => drawer.current?.showModal()}
              aria-controls="workspace-navigation"
              aria-haspopup="dialog"
              className="rounded-sm p-2 text-ink-muted hover:bg-canvas-2 lg:hidden"
              aria-label={label('Open navigation', 'নেভিগেশন খুলুন')}
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-sm font-semibold text-ink">
                {workspace}
              </p>
              <p className="hidden text-xs text-ink-muted sm:block">
                {admin ? 'Manage your POWERLAB learning platform' : t('Track your learning and assessments', 'শেখা ও মূল্যায়নের অগ্রগতি দেখুন')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {!admin && (
              <select
                aria-label={t('Select language', 'ভাষা নির্বাচন করুন')}
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="h-9 max-w-[6.75rem] rounded-sm border border-line bg-surface px-2 text-xs sm:max-w-36"
              >
                {languages.map((item) => <option key={item.code} value={item.code} lang={item.code}>{item.nameNative}</option>)}
              </select>
            )}
            <span className="hidden rounded-full border border-forest-200 bg-forest-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-forest-700 sm:inline-flex">
              {account}
            </span>

            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-100 text-sm font-semibold text-forest-700"
              title={displayName}
              aria-label={`Signed in as ${displayName}`}
            >
              {initials || (admin ? 'A' : 'S')}
            </div>
          </div>
        </header>

        <main id="workspace-content" tabIndex={-1} className="mx-auto w-full max-w-[1500px] p-5 sm:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
