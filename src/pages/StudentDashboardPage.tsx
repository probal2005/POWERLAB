import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ClipboardCheck,
  ArrowRight,
  GraduationCap,
  LogOut,
  UserRound,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useAuth } from '@/context/AuthContext';

export default function StudentDashboardPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const displayName =
    profile?.full_name?.trim() || user?.email || 'Student';

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

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/student" aria-label="POWERLAB student dashboard">
            <BrandLogo variant="header" />
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="btn-ghost flex items-center gap-2"
          >
            <LogOut size={17} />
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-9 px-5 py-10 sm:px-8 sm:py-14">
        <section className="border-b border-line pb-9">
          <p className="eyebrow text-bronze-600">Student workspace</p>

          <div className="mt-4 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
                Welcome back, {displayName}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
                Your POWERLAB learning space. Explore the 48 Laws,
                study lessons, and work through your assessments.
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 border border-forest-200 bg-forest-50 px-3 py-2 text-xs font-semibold text-forest-700">
              <GraduationCap size={16} />
              Student account
            </span>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <Link
            to="/laws"
            className="group border border-line bg-surface p-6 transition-colors hover:border-forest-300 sm:p-8"
          >
            <div className="flex h-12 w-12 items-center justify-center bg-canvas-2 text-forest-700">
              <BookOpen size={23} />
            </div>

            <h2 className="mt-6 font-display text-2xl text-ink">
              Explore the 48 Laws
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Browse the learning library, explore individual laws,
              and continue studying.
            </p>

            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest-700">
              Explore lessons
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            to="/assessment/final"
            className="group border border-line bg-surface p-6 transition-colors hover:border-forest-300 sm:p-8"
          >
            <div className="flex h-12 w-12 items-center justify-center bg-canvas-2 text-forest-700">
              <ClipboardCheck size={23} />
            </div>

            <h2 className="mt-6 font-display text-2xl text-ink">
              Assessments
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Test your understanding and evaluate what you have
              learned through assessments.
            </p>

            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest-700">
              View assessments
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </section>

        <section className="border border-line bg-surface p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <UserRound size={21} className="text-forest-700" />
            <h2 className="font-display text-xl text-ink">
              Account information
            </h2>
          </div>

          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Full name
              </dt>
              <dd className="mt-2 text-sm text-ink">
                {profile?.full_name || 'Not provided'}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Email address
              </dt>
              <dd className="mt-2 break-all text-sm text-ink">
                {profile?.email || user?.email || 'Unavailable'}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Account role
              </dt>
              <dd className="mt-2 text-sm capitalize text-ink">
                {profile?.role || 'Student'}
              </dd>
            </div>
          </dl>

          {logoutError && (
            <p role="alert" className="mt-5 text-sm text-error">
              {logoutError}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
