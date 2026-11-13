import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ClipboardCheck,
  ArrowRight,
  GraduationCap,
  LogOut,
  UserRound,
  Bookmark,
  Clock3,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useAuth } from '@/context/AuthContext';
import { useContent } from '@/context/ContentContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';

type ProgressRow = { law_slug: string; status: string; last_viewed_at: string };
type AttemptRow = { id: string; law_slug: string; created_at: string; score: number; total_questions: number; percentage: number; passed: boolean };

export default function StudentDashboardPage() {
  const { user, profile, signOut } = useAuth();
  const { laws } = useContent();
  const { language, t, tx } = useLanguage();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [learningError, setLearningError] = useState('');
  const [learningLoading, setLearningLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) return;
    setLearningLoading(true);
    void Promise.all([
      supabase.from('student_law_progress').select('law_slug,status,last_viewed_at').eq('user_id', user.id).order('last_viewed_at', { ascending: false }).limit(48),
      supabase.from('student_bookmarks').select('law_slug').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('student_assessment_attempts').select('id,law_slug,created_at,score,total_questions,percentage,passed').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    ]).then(([progressResult, bookmarkResult, attemptResult]) => {
      if (!active) return;
      const firstError = progressResult.error ?? bookmarkResult.error ?? attemptResult.error;
      if (firstError) setLearningError(t('Some learning data could not be loaded. Please refresh to try again.', 'কিছু শেখার তথ্য লোড করা যায়নি। আবার চেষ্টা করতে রিফ্রেশ করুন।'));
      setProgress((progressResult.data ?? []) as ProgressRow[]);
      setBookmarks((bookmarkResult.data ?? []).map((row) => row.law_slug));
      setAttempts((attemptResult.data ?? []) as AttemptRow[]);
      setLearningLoading(false);
    });
    return () => { active = false; };
  }, [user, t]);

  const completedCount = progress.filter((item) => item.status === 'completed').length;
  const availableAssessments = laws.filter((law) => law.isPublished !== false && law.assessment?.isPublished && (law.assessment.questions?.length ?? 0) > 0);
  const lawBySlug = useMemo(() => new Map(laws.map((law) => [law.slug, law])), [laws]);

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
          <p className="eyebrow text-bronze-600">{t('Student workspace', 'শিক্ষার্থী কর্মক্ষেত্র')}</p>

          <div className="mt-4 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
                {t(`Welcome back, ${displayName}`, `স্বাগতম, ${displayName}`)}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
                {t('Your learning, saved lessons, and assessment results in one place.', 'আপনার শেখা, সংরক্ষিত পাঠ এবং মূল্যায়নের ফলাফল এক জায়গায়।')}
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 border border-forest-200 bg-forest-50 px-3 py-2 text-xs font-semibold text-forest-700">
              <GraduationCap size={16} />
              {t('Student account', 'শিক্ষার্থী অ্যাকাউন্ট')}
            </span>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: t('Lessons started', 'শুরু করা পাঠ'), value: progress.length, Icon: BookOpen },
            { label: t('Lessons completed', 'সম্পন্ন পাঠ'), value: completedCount, Icon: GraduationCap },
            { label: t('Saved lessons', 'সংরক্ষিত পাঠ'), value: bookmarks.length, Icon: Bookmark },
          ].map(({ label, value, Icon }) => <div key={label} className="border border-line bg-surface p-5"><Icon size={19} className="text-forest-700" /><p className="mt-4 font-display text-3xl text-ink">{value}</p><p className="mt-1 text-xs text-ink-muted">{label}</p></div>)}
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
            to="/assessments"
            className="group border border-line bg-surface p-6 transition-colors hover:border-forest-300 sm:p-8"
          >
            <div className="flex h-12 w-12 items-center justify-center bg-canvas-2 text-forest-700">
              <ClipboardCheck size={23} />
            </div>

            <h2 className="mt-6 font-display text-2xl text-ink">
              Assessments
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              {t(`${availableAssessments.length} lesson assessments are currently available. The final assessment opens after its question bank is published.`, `এখন ${availableAssessments.length}টি পাঠের মূল্যায়ন চালু আছে। চূড়ান্ত মূল্যায়নের প্রশ্ন প্রকাশিত হলে সেটি চালু হবে।`)}
            </p>

            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest-700">
              {t('Find available assessments', 'চালু মূল্যায়ন দেখুন')}
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </section>

        <Link to="/certification" className="flex flex-col gap-3 border border-line bg-surface p-6 transition-colors hover:border-forest-300 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div><p className="eyebrow text-bronze-600">POWERLAB</p><h2 className="mt-2 font-display text-2xl text-ink">Certification programme</h2><p className="mt-2 text-sm text-ink-muted">Review your module readiness, completion, final assessment, and certificate status.</p></div>
          <span className="btn-secondary w-fit">View certification</span>
        </Link>

        {learningError && <p role="status" className="border border-bronze-200 bg-bronze-50 p-4 text-sm text-ink-muted">{learningError}</p>}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="border border-line bg-surface p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl text-ink">{t('Continue learning', 'শেখা চালিয়ে যান')}</h2><Clock3 size={19} className="text-forest-700" /></div>
            {learningLoading ? <p className="mt-5 text-sm text-ink-muted">{t('Loading your learning data…', 'আপনার শেখার তথ্য লোড হচ্ছে…')}</p> : progress.length === 0 ? <p className="mt-5 text-sm text-ink-muted">{t('Your lesson activity will appear here as you study.', 'আপনি পড়াশোনা শুরু করলে আপনার পাঠের অগ্রগতি এখানে দেখা যাবে।')}</p> : <ul className="mt-5 divide-y divide-line">{progress.slice(0, 5).map((item) => { const law = lawBySlug.get(item.law_slug); if (!law) return null; return <li key={item.law_slug} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium text-ink">{tx(`law:${law.slug}:title`, law.titleEn, law.titleBn)}</p><p className="mt-1 text-xs text-ink-muted">{item.status === 'completed' ? t('Completed', 'সম্পন্ন') : t('In progress', 'চলমান')}</p></div><Link className="text-sm font-semibold text-forest-700 hover:underline" to={`/laws/${law.slug}`}>{t('Open', 'খুলুন')}</Link></li>; })}</ul>}
          </div>

          <div className="border border-line bg-surface p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl text-ink">{t('Recent assessment results', 'সাম্প্রতিক মূল্যায়ন')}</h2><ClipboardCheck size={19} className="text-forest-700" /></div>
            {learningLoading ? <p className="mt-5 text-sm text-ink-muted">{t('Loading your results…', 'ফলাফল লোড হচ্ছে…')}</p> : attempts.length === 0 ? <p className="mt-5 text-sm text-ink-muted">{t('Your submitted assessment results will appear here.', 'আপনার জমা দেওয়া মূল্যায়নের ফল এখানে দেখা যাবে।')}</p> : <ul className="mt-5 divide-y divide-line">{attempts.map((attempt) => { const law = lawBySlug.get(attempt.law_slug); return <li key={attempt.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium text-ink">{law ? tx(`law:${law.slug}:title`, law.titleEn, law.titleBn) : attempt.law_slug === '__final__' ? t('Final assessment', 'চূড়ান্ত মূল্যায়ন') : attempt.law_slug}</p><p className="mt-1 text-xs text-ink-muted">{new Date(attempt.created_at).toLocaleDateString(language)} · {attempt.score}/{attempt.total_questions}</p></div><span className={`text-sm font-semibold ${attempt.passed ? 'text-forest-700' : 'text-red-700'}`}>{attempt.percentage}%</span></li>; })}</ul>}
          </div>
        </section>

        {bookmarks.length > 0 && <section className="border border-line bg-surface p-6 sm:p-8"><h2 className="font-display text-xl text-ink">{t('Saved lessons', 'সংরক্ষিত পাঠ')}</h2><div className="mt-5 flex flex-wrap gap-3">{bookmarks.map((slug) => { const law = lawBySlug.get(slug); return law ? <Link key={slug} className="border border-line px-4 py-3 text-sm text-forest-700 hover:border-forest-300" to={`/laws/${slug}`}>{tx(`law:${law.slug}:title`, law.titleEn, law.titleBn)}</Link> : null; })}</div></section>}

        <section className="border border-line bg-surface p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <UserRound size={21} className="text-forest-700" />
            <h2 className="font-display text-xl text-ink">
              {t('Account information', 'অ্যাকাউন্টের তথ্য')}
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
