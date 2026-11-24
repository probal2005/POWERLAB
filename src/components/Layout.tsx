import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const learningPage = /^\/(?:laws(?:\/|$)|assessments(?:\/|$)|assessment\/)/.test(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:p-3">Skip to content</a>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1">
        {profile?.role === 'student' && learningPage && (
          <div className="border-b border-line">
            <div className="container-content py-1">
              <Link to="/student" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forest-700 hover:underline">
                <ArrowLeft size={16} aria-hidden="true" />
                {t('Back to dashboard', 'ড্যাশবোর্ডে ফিরুন')}
              </Link>
            </div>
          </div>
        )}
        {children}
      </main>
      <Footer />
    </div>
  );
}
