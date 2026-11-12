import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, Languages } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import BrandLogo from './BrandLogo';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const { user, profile, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setLangOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
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
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              aria-label="Select language"
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs font-semibold">{language === 'en' ? 'EN' : 'বাংলা'}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 mt-2 w-36 z-50 surface-card shadow-soft overflow-hidden">
                  <button
                    onClick={() => { setLanguage('en'); setLangOpen(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-canvas-2 ${
                      language === 'en' ? 'text-forest-600 font-semibold' : 'text-ink'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => { setLanguage('bn'); setLangOpen(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm font-bengali transition-colors hover:bg-canvas-2 ${
                      language === 'bn' ? 'text-forest-600 font-semibold' : 'text-ink'
                    }`}
                  >
                    বাংলা
                  </button>
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
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden btn-ghost p-2"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-canvas animate-fade-up overflow-y-auto">
          <div className="container-content py-6 flex flex-col gap-1">
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
          </div>
        </div>
      )}
    </header>
  );
}
