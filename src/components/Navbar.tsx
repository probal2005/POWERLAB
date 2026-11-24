import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, Languages } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import BrandLogo from './BrandLogo';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { language, languages, setLanguage, t } = useLanguage();
  const { user, profile, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const location = useLocation();
  const menu = useRef<HTMLDialogElement>(null);
  const languageName = languages.find((item) => item.code === language)?.nameNative ?? language;

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (desktop.matches) menu.current?.close(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    menu.current?.close();
    setLangOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const navItems = [
    { to: '/', label: t('Home', 'হোম'), end: true },
    { to: '/laws', label: t('Explore 48 Laws', '৪৮ নিয়ম'), end: false },
    { to: '/about', label: t('About', 'পরিচিতি'), end: false },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-canvas/90 backdrop-blur-md border-b border-line'
          : 'bg-canvas border-b border-transparent'
      }`}
    >
      <nav className="container-content flex h-16 items-center justify-between gap-4" aria-label="Main">
        <Link to="/" className="flex items-center shrink-0" aria-label="POWERLAB home">
          <BrandLogo variant="header" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setLangOpen((o) => !o)}
              className="btn-ghost px-3 py-2"
              aria-expanded={langOpen}
              onKeyDown={(event) => { if (event.key === 'Escape') setLangOpen(false); }}
              aria-label={`${languageName} · ${t('Select language', 'ভাষা নির্বাচন করুন')}`}
            >
              <Languages className="h-4 w-4" />
              <span className="max-w-24 truncate text-xs font-semibold">{languageName}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 mt-2 w-44 z-50 surface-card shadow-soft max-h-[60vh] overflow-auto">
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      lang={item.code}
                      aria-pressed={language === item.code}
                      onClick={() => { setLanguage(item.code); setLangOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-canvas-2 ${
                        item.code === 'bn' ? 'font-bengali' : ''
                      } ${
                        language === item.code ? 'text-forest-600 font-semibold' : 'text-ink'
                      }`}
                    >
                      <span className="block">{item.nameNative}</span>
                      {item.nameNative !== item.nameEn && <span className="block text-[10px] text-ink-muted">{item.nameEn}</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {!loading && user && profile ? (
            <Link
              to={profile.role === 'admin' ? '/admin' : '/student'}
              className="hidden sm:inline-flex btn-primary px-5 py-2.5"
            >
              {profile.role === 'admin'
                ? t('Admin Workspace', 'অ্যাডমিন ওয়ার্কস্পেস')
                : t('Student Dashboard', 'শিক্ষার্থী ড্যাশবোর্ড')}
            </Link>
          ) : !loading && !user ? (
            <>
              <Link to="/login" className="hidden sm:inline-flex btn-ghost">
                {t('Sign In', 'প্রবেশ')}
              </Link>
              <Link to="/register" className="hidden sm:inline-flex btn-primary px-5 py-2.5">
                {t('Start Learning', 'শুরু করুন')}
              </Link>
            </>
          ) : null}

          {/* Mobile toggle */}
          <button
            onClick={() => {
              setLangOpen(false);
              menu.current?.showModal();
              setMobileOpen(true);
            }}
            className="md:hidden btn-ghost p-2"
            aria-label={t('Open menu', 'মেনু খুলুন')}
            aria-controls="public-menu"
            aria-haspopup="dialog"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <dialog
        ref={menu}
        id="public-menu"
        aria-label={t('Main menu', 'প্রধান মেনু')}
        onClose={() => setMobileOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) menu.current?.close(); }}
        className="fixed inset-x-0 top-0 m-0 max-h-[100dvh] w-full max-w-none bg-canvas p-0 text-ink backdrop:bg-ink/40"
      >
        <div className="container-content flex flex-col gap-1 py-5">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <BrandLogo variant="header" />
            <button type="button" onClick={() => menu.current?.close()} className="btn-ghost p-2" aria-label={t('Close menu', 'মেনু বন্ধ করুন')}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav aria-label={t('Main', 'প্রধান')} className="flex flex-col" onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('a')) menu.current?.close();
          }}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between py-4 border-b border-line text-base font-medium ${
                    isActive ? 'text-forest-600' : 'text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="flex flex-col gap-3 pt-6">
              {!loading && user && profile ? (
                <Link
                  to={profile.role === 'admin' ? '/admin' : '/student'}
                  className="btn-primary w-full"
                >
                  {profile.role === 'admin'
                    ? t('Admin Workspace', 'অ্যাডমিন ওয়ার্কস্পেস')
                    : t('Student Dashboard', 'শিক্ষার্থী ড্যাশবোর্ড')}
                </Link>
              ) : !loading && !user ? (
                <>
                  <Link to="/login" className="btn-secondary w-full">
                    {t('Sign In', 'প্রবেশ')}
                  </Link>
                  <Link to="/register" className="btn-primary w-full">
                    {t('Start Learning', 'শুরু করুন')}
                  </Link>
                </>
              ) : null}
            </div>
          </nav>
        </div>
      </dialog>
    </header>
  );
}
