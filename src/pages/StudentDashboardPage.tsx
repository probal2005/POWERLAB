import { readPosition } from '@/lib/readingPosition';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ClipboardCheck,
  ArrowRight,
  GraduationCap,
  UserRound,
  Bookmark,
  Clock3,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useContent } from '@/context/ContentContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';

type ProgressRow = { law_slug: string; status: string; last_viewed_at: string };
type AttemptRow = { id: string; law_slug: string; created_at: string; score: number; total_questions: number; percentage: number; passed: boolean };

export default function StudentDashboardPage() {
  const { user, profile } = useAuth();
  const { laws, loading: contentLoading, error: contentError } = useContent();
  const { language, t, tx } = useLanguage();
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [learningError, setLearningError] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [learningLoading, setLearningLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) return;
    let inFlight = false;
    const sync = async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      await Promise.all([
      supabase.from('student_law_progress').select('law_slug,status,last_viewed_at').eq('user_id', user.id).order('last_viewed_at', { ascending: false }),
      supabase.from('student_bookmarks').select('law_slug').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('student_assessment_attempts').select('id,law_slug,created_at,score,total_questions,percentage,passed').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    ]).then(([progressResult, bookmarkResult, attemptResult]) => {
      inFlight = false;
      if (!active) return;
      const firstError = progressResult.error ?? bookmarkResult.error ?? attemptResult.error;
      if (firstError) setLearningError(t('Some learning data could not be loaded. We’ll retry automatically.', 'কিছু শেখার তথ্য লোড করা যায়নি। স্বয়ংক্রিয়ভাবে আবার চেষ্টা করা হবে।'));
      else { setLearningError(''); setLastSync(new Date()); }
      if (!progressResult.error) setProgress((progressResult.data ?? []) as ProgressRow[]);
      if (!bookmarkResult.error) setBookmarks((bookmarkResult.data ?? []).map((row) => row.law_slug));
      if (!attemptResult.error) setAttempts((attemptResult.data ?? []) as AttemptRow[]);
      setLearningLoading(false);
    });
    };
    void sync();
    const timer = window.setInterval(() => void sync(), 15000);
    const onFocus = () => void sync();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [user, t]);

  const completedCount = progress.filter((item) => item.status === 'completed').length;
  const availableAssessments = laws.filter((law) => law.isPublished !== false && law.assessment?.isPublished && (law.assessment.questions?.length ?? 0) > 0);
  const lawBySlug = useMemo(() => new Map(laws.map((law) => [law.slug, law])), [laws]);

  const lastPosition = user ? readPosition(user.id) : null;
  const resumeLaw = lastPosition ? lawBySlug.get(lastPosition.slug) : undefined;

  const displayName =
    profile?.full_name?.trim() || user?.email || 'Student';

  return (
    <div className="space-y-9">
      <section className="border-b border-line pb-8">
        <p className="eyebrow text-bronze-600">{t('Learning overview', 'শেখার সংক্ষিপ্ত বিবরণ')}</p>
        <h1 className="mt-3 break-words font-display text-3xl tracking-tight text-ink sm:text-4xl">
          {t(`Welcome back, ${displayName}`, `স্বাগতম, ${displayName}`)}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
          {t('Your learning, saved lessons, and assessment results in one place.', 'আপনার শেখা, সংরক্ষিত পাঠ এবং মূল্যায়নের ফলাফল এক জায়গায়।')}
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="border border-line bg-surface p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl text-ink">{t('Continue learning', 'শেখা চালিয়ে যান')}</h2><Clock3 size={19} className="text-forest-700" /></div>
          {resumeLaw && lastPosition && <Link className="btn-primary mt-4" to={`/laws/${resumeLaw.slug}?section=${lastPosition.section}`}>
            {t('Resume last lesson', 'শেষ পাঠে ফিরে যান')} · {tx(`law:${resumeLaw.slug}:title`, resumeLaw.titleEn, resumeLaw.titleBn)}
          </Link>}
          {learningLoading || contentLoading ? <p role="status" className="mt-5 text-sm text-ink-muted">{t('Loading your learning data…', 'আপনার শেখার তথ্য লোড হচ্ছে…')}</p> : progress.length === 0 ? <p className="mt-5 text-sm text-ink-muted">{t('Your lesson activity will appear here as you study.', 'আপনি পড়াশোনা শুরু করলে আপনার পাঠের অগ্রগতি এখানে দেখা যাবে।')}</p> : <ul className="mt-5 divide-y divide-line">{progress.slice(0, 5).map((item) => { const law = lawBySlug.get(item.law_slug); if (!law) return null; return <li key={item.law_slug} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium text-ink">{tx(`law:${law.slug}:title`, law.titleEn, law.titleBn)}</p><p className="mt-1 text-xs text-ink-muted">{item.status === 'completed' ? t('Completed', 'সম্পন্ন') : t('In progress', 'চলমান')}</p></div><Link className="text-sm font-semibold text-forest-700 hover:underline" to={`/laws/${law.slug}`}>{t('Open', 'খুলুন')}</Link></li>; })}</ul>}
        </div>

        <div className="border border-line bg-surface p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl text-ink">{t('Recent assessment results', 'সাম্প্রতিক মূল্যায়ন')}</h2><ClipboardCheck size={19} className="text-forest-700" /></div>
          {learningLoading ? <p className="mt-5 text-sm text-ink-muted">{t('Loading your results…', 'ফলাফল লোড হচ্ছে…')}</p> : attempts.length === 0 ? <p className="mt-5 text-sm text-ink-muted">{t('Your submitted assessment results will appear here.', 'আপনার জমা দেওয়া মূল্যায়নের ফল এখানে দেখা যাবে।')}</p> : <ul className="mt-5 divide-y divide-line">{attempts.map((attempt) => { const law = lawBySlug.get(attempt.law_slug); return <li key={attempt.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium text-ink">{law ? tx(`law:${law.slug}:title`, law.titleEn, law.titleBn) : attempt.law_slug === '__final__' ? t('Final assessment', 'চূড়ান্ত মূল্যায়ন') : attempt.law_slug}</p><p className="mt-1 text-xs text-ink-muted">{new Date(attempt.created_at).toLocaleDateString(language)} · {attempt.score}/{attempt.total_questions}</p></div><span className={`text-sm font-semibold ${attempt.passed ? 'text-forest-700' : 'text-red-700'}`}>{attempt.percentage}%</span></li>; })}</ul>}
        </div>
      </section>

      <section aria-busy={learningLoading} className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t('Lessons started', 'শুরু করা পাঠ'), value: progress.length, Icon: BookOpen },
          { label: t('Lessons completed', 'সম্পন্ন পাঠ'), value: completedCount, Icon: GraduationCap },
          { label: t('Saved lessons', 'সংরক্ষিত পাঠ'), value: bookmarks.length, Icon: Bookmark },
        ].map(({ label, value, Icon }) => <div key={label} className="border border-line bg-surface p-5"><Icon size={19} className="text-forest-700" /><p className="mt-4 font-display text-3xl text-ink">{learningLoading ? '—' : value}</p><p className="mt-1 text-xs text-ink-muted">{label}</p></div>)}
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

      <Link to="/student/review" className="btn-secondary">{t('Review missed questions and notes', 'ভুল প্রশ্ন ও নোট দেখুন')}</Link>
      {lastSync && <p className="text-xs text-ink-muted">Last synced <time dateTime={lastSync.toISOString()}>{lastSync.toLocaleTimeString(language)}</time> · refreshes every 15 seconds</p>}
      {(learningError || contentError) && <p role="status" className="border border-bronze-200 bg-bronze-50 p-4 text-sm text-ink-muted">{learningError || contentError}</p>}

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
      </section>
    </div>
  );
}
