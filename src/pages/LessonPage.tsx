import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronRight,
  List,
  Minus,
  Plus,
  AlignLeft,
  X,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useContent } from '@/context/ContentContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type FontSize = 'sm' | 'md' | 'lg';
type ReadWidth = 'narrow' | 'normal' | 'wide';

const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: 'text-[0.95rem]',
  md: 'text-[1.0625rem]',
  lg: 'text-[1.1875rem]',
};
const WIDTH_MAP: Record<ReadWidth, string> = {
  narrow: 'max-w-prose-narrow',
  normal: 'max-w-reading',
  wide: 'max-w-[52rem]',
};

export default function LessonPage() {
  const { slug } = useParams<{ slug: string }>();
  const { language, setLanguage, t } = useLanguage();
  const { laws, categories, loading } = useContent();
  const { user } = useAuth();

  const law = useMemo(
    () => laws.find((item) => item.slug === slug && item.isPublished !== false),
    [laws, slug]
  );
  const sections = law?.sections;

  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [readWidth, setReadWidth] = useState<ReadWidth>('normal');
  const [bookmarked, setBookmarked] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  const sectionRefs = useRef<Record<number, HTMLElement | null>>({});
  const [activeSection, setActiveSection] = useState(0);

  // Reset state on law change
  useEffect(() => {
    setFontSize('md');
    setReadWidth('normal');
    setTocOpen(false);
    setActiveSection(0);
  }, [slug]);

  // Restore learning state from the account when signed in, with local fallback for guests.
  useEffect(() => {
    if (!slug) return;
    if (user) {
      void Promise.all([
        supabase.from('student_bookmarks').select('law_slug').eq('user_id', user.id).eq('law_slug', slug).maybeSingle(),
        supabase.from('student_law_progress').select('status').eq('user_id', user.id).eq('law_slug', slug).maybeSingle(),
      ]).then(([bookmark, progress]) => {
        if (!bookmark.error) setBookmarked(Boolean(bookmark.data));
        if (!progress.error) setCompleted(progress.data?.status === 'completed');
      });
      return;
    }
    try {
      const bm = JSON.parse(localStorage.getItem('powerlab:bookmarks') || '[]');
      setBookmarked(bm.includes(slug));
      const cmp = JSON.parse(localStorage.getItem('powerlab:completed') || '[]');
      setCompleted(cmp.includes(slug));
    } catch {
      /* ignore */
    }
  }, [slug, user]);

  const persistBookmark = (next: boolean) => {
    if (!slug) return;
    if (user) {
      const request = next
        ? supabase.from('student_bookmarks').insert({ user_id: user.id, law_slug: slug })
        : supabase.from('student_bookmarks').delete().eq('user_id', user.id).eq('law_slug', slug);
      void request.then(({ error }) => {
        if (error) console.error('Bookmark could not be saved:', error.message);
      });
      return;
    }
    try {
      const bm: string[] = JSON.parse(localStorage.getItem('powerlab:bookmarks') || '[]');
      const updated = next ? [...new Set([...bm, slug])] : bm.filter((s) => s !== slug);
      localStorage.setItem('powerlab:bookmarks', JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const persistCompleted = (next: boolean) => {
    if (!slug) return;
    if (user) {
      void supabase.from('student_law_progress').upsert({
        user_id: user.id, law_slug: slug, status: next ? 'completed' : 'in_progress',
        completed_at: next ? new Date().toISOString() : null, last_viewed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,law_slug' }).then(({ error }) => {
        if (error) console.error('Learning progress could not be saved:', error.message);
      });
      return;
    }
    try {
      const cmp: string[] = JSON.parse(localStorage.getItem('powerlab:completed') || '[]');
      const updated = next ? [...new Set([...cmp, slug])] : cmp.filter((s) => s !== slug);
      localStorage.setItem('powerlab:completed', JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!slug || !user) return;
    void supabase.from('student_law_progress').upsert({
      user_id: user.id, law_slug: slug, last_viewed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,law_slug', ignoreDuplicates: true });
  }, [slug, user]);

  // Scroll-spy for active TOC highlight
  useEffect(() => {
    if (!sections || sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const idx = Number((visible[0].target as HTMLElement).dataset.idx);
          setActiveSection(idx);
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );
    sections.forEach((_, i) => {
      const el = sectionRefs.current[i];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  if (!law && loading) {
    return (
      <div className="container-content flex items-center justify-center py-32" role="status" aria-live="polite">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-forest-300 border-t-forest-600" aria-hidden="true" />
        <span className="sr-only">Loading lesson</span>
      </div>
    );
  }

  if (!law) {
    return <Navigate to="/laws" replace />;
  }

  const publishedLaws = laws.filter((item) => item.isPublished !== false);
  const idx = publishedLaws.findIndex((item) => item.slug === law.slug);
  const prev = idx > 0 ? publishedLaws[idx - 1] : null;
  const next = idx < publishedLaws.length - 1 ? publishedLaws[idx + 1] : null;
  const cat = categories.find((c) => c.id === law.category);
  const hasFullContent = sections && sections.length > 0;
  const assessmentQuestionCount = law.assessment?.questions.length ?? 0;
  const hasPublishedAssessment =
    law.assessment?.isPublished === true && assessmentQuestionCount > 0;

  const toggleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    persistBookmark(next);
  };
  const toggleCompleted = () => {
    const next = !completed;
    setCompleted(next);
    persistCompleted(next);
  };

  const scrollToSection = (i: number) => {
    sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTocOpen(false);
  };

  return (
    <div className={language === 'bn' ? 'font-bengali' : ''}>
      {/* Breadcrumb bar */}
      <div className="border-b border-line bg-canvas-2/40">
        <div className="container-content py-3">
          <nav className="flex items-center gap-1.5 text-xs text-ink-muted" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-forest-600 transition-colors">{t('Home', 'হোম')}</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/laws" className="hover:text-forest-600 transition-colors">{t('48 Laws', '৪৮ নিয়ম')}</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-ink truncate">
              {t(`Law ${law.number}`, `নিয়ম ${law.number}`)}
            </span>
          </nav>
        </div>
      </div>

      {/* Lesson header */}
      <header className="border-b border-line">
        <div className="container-content py-12 md:py-16">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="font-display text-sm font-semibold text-bronze-500">
                {t('Law', 'নিয়ম')} {String(law.number).padStart(2, '0')}
              </span>
              {cat && (
                <span className="text-xs text-ink-muted border border-line rounded-full px-3 py-0.5">
                  {language === 'en' ? cat.labelEn : cat.labelBn}
                </span>
              )}
            </div>
            <h1 className={`mt-5 font-display text-3xl md:text-[2.75rem] leading-[1.15] tracking-tightish text-ink ${language === 'bn' ? 'font-bengali' : ''}`}>
              {language === 'en' ? law.titleEn : law.titleBn}
            </h1>
            <p className={`mt-5 text-lg leading-[1.7] text-ink-muted ${language === 'bn' ? 'font-bengali' : ''}`}>
              {language === 'en' ? law.shortEn : law.shortBn}
            </p>
          </div>
        </div>
      </header>

      {/* Reading tools bar */}
      <div className="sticky top-16 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="container-content py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleBookmark}
                className={`btn-ghost px-2.5 ${bookmarked ? 'text-forest-600' : ''}`}
                aria-pressed={bookmarked}
                title={t('Bookmark', 'বুকমার্ক')}
              >
                {bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                <span className="hidden sm:inline text-xs">{t('Bookmark', 'বুকমার্ক')}</span>
              </button>
              <button
                onClick={toggleCompleted}
                className={`btn-ghost px-2.5 ${completed ? 'text-success' : ''}`}
                aria-pressed={completed}
                title={t('Mark as completed', 'সম্পূর্ণ হিসেবে চিহ্নিত')}
              >
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">{completed ? t('Completed', 'সম্পূর্ণ') : t('Mark complete', 'সম্পূর্ণ করুন')}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Font size */}
              <div className="hidden sm:flex items-center gap-0.5 border border-line rounded-full p-0.5 bg-surface">
                <ToolButton active={fontSize === 'sm'} onClick={() => setFontSize('sm')} title="Smaller">
                  <Minus className="h-3.5 w-3.5" />
                </ToolButton>
                <ToolButton active={fontSize === 'md'} onClick={() => setFontSize('md')} title="Default">
                  <AlignLeft className="h-3.5 w-3.5" />
                </ToolButton>
                <ToolButton active={fontSize === 'lg'} onClick={() => setFontSize('lg')} title="Larger">
                  <Plus className="h-3.5 w-3.5" />
                </ToolButton>
              </div>

              {/* Width */}
              <div className="hidden md:flex items-center gap-0.5 border border-line rounded-full p-0.5 bg-surface">
                <ToolButton active={readWidth === 'narrow'} onClick={() => setReadWidth('narrow')} title="Narrow">
                  <span className="text-[0.65rem] font-semibold">N</span>
                </ToolButton>
                <ToolButton active={readWidth === 'normal'} onClick={() => setReadWidth('normal')} title="Normal">
                  <span className="text-[0.65rem] font-semibold">M</span>
                </ToolButton>
                <ToolButton active={readWidth === 'wide'} onClick={() => setReadWidth('wide')} title="Wide">
                  <span className="text-[0.65rem] font-semibold">W</span>
                </ToolButton>
              </div>

              {/* Language */}
              <div className="flex items-center gap-0.5 border border-line rounded-full p-0.5 bg-surface">
                <ToolButton active={language === 'en'} onClick={() => setLanguage('en')} title="English">
                  <span className="text-[0.65rem] font-semibold">EN</span>
                </ToolButton>
                <ToolButton active={language === 'bn'} onClick={() => setLanguage('bn')} title="বাংলা">
                  <span className="text-[0.65rem] font-semibold">বাংলা</span>
                </ToolButton>
              </div>

              {/* TOC toggle (mobile) */}
              <button
                onClick={() => setTocOpen(true)}
                className="lg:hidden btn-ghost px-2.5 border border-line"
                aria-label="Table of contents"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body: TOC + content */}
      <div className="container-content py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Desktop TOC */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-32">
              <div className="eyebrow mb-4">{t('Contents', 'সূচি')}</div>
              <nav className="space-y-1">
                {sections && sections.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => scrollToSection(i)}
                    className={`block w-full text-left text-sm py-1.5 pl-3 border-l-2 transition-colors ${
                      activeSection === i
                        ? 'border-forest-500 text-forest-600 font-medium'
                        : 'border-line text-ink-muted hover:text-ink hover:border-forest-300'
                    }`}
                  >
                    {language === 'en' ? s.headingEn : s.headingBn}
                  </button>
                ))}
                {(!hasFullContent) && (
                  <p className="text-sm text-ink-muted italic pl-3 pt-2">
                    {t('Full lesson content coming soon.', 'সম্পূর্ণ পাঠ সামগ্রী শীঘ্রই।')}
                  </p>
                )}
              </nav>
            </div>
          </aside>

          {/* Reading column */}
          <article className="lg:col-span-9">
            <div className={`mx-auto ${WIDTH_MAP[readWidth]} reading-body`}>
              {/* Completed banner */}
              {completed && (
                <div className="mb-8 flex items-center gap-2 rounded-sm border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
                  <Check className="h-4 w-4" />
                  {t('You marked this lesson as completed.', 'আপনি এই পাঠ সম্পূর্ণ হিসেবে চিহ্নিত করেছেন।')}
                </div>
              )}

              {hasFullContent ? (
                <div className={FONT_SIZE_MAP[fontSize]}>
                  {sections.map((s, i) => (
                    <section
                      key={i}
                      ref={(el) => { sectionRefs.current[i] = el; }}
                      data-idx={i}
                      className="scroll-mt-32"
                    >
                      <h2 className={language === 'bn' ? 'font-bengali' : ''}>
                        {language === 'en' ? s.headingEn : s.headingBn}
                      </h2>
                      {(language === 'en' ? s.bodyEn : s.bodyBn).map((para, pi) => (
                        <p key={pi} className={language === 'bn' ? 'font-bengali' : ''}>{para}</p>
                      ))}
                    </section>
                  ))}
                </div>
              ) : (
                <div className={FONT_SIZE_MAP[fontSize]}>
                  <section ref={(el) => { sectionRefs.current[0] = el; }} data-idx={0} className="scroll-mt-32">
                    <h2>{t('Summary', 'সারসংক্ষেপ')}</h2>
                    <p className={language === 'bn' ? 'font-bengali' : ''}>
                      {language === 'en' ? law.shortEn : law.shortBn}
                    </p>
                  </section>
                  <section ref={(el) => { sectionRefs.current[1] = el; }} data-idx={1} className="scroll-mt-32">
                    <h2>{t('Full lesson content', 'সম্পূর্ণ পাঠ সামগ্রী')}</h2>
                    <p>
                      {t(
                        'The complete lesson for this law — including the core principle, psychological explanation, real-life examples, practical application, defensive strategy, and ethical considerations — is being prepared and will be available soon.',
                        'এই নিয়মের সম্পূর্ণ পাঠ — মূল নীতি, মনস্তাত্ত্বিক ব্যাখ্যা, বাস্তব উদাহরণ, ব্যবহারিক প্রয়োগ, প্রতিরক্ষামূলক কৌশল এবং নৈতিক বিবেচনা সহ — প্রস্তুত করা হচ্ছে এবং শীঘ্রই উপলব্ধ হবে।'
                      )}
                    </p>
                    <p className="text-ink-muted">
                      {t(
                        'In the meantime, you can explore the laws that already have full lessons available.',
                        'এই সময়ে, আপনি এমন নিয়মগুলি অন্বেষণ করতে পারেন যাদের সম্পূর্ণ পাঠ ইতিমধ্যে উপলব্ধ।'
                      )}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link to="/laws/never-outshine-the-master" className="btn-secondary text-sm">
                        {t('Law 01 — Never Outshine the Master', 'নিয়ম ০১')}
                      </Link>
                      <Link to="/laws/conceal-your-intentions" className="btn-secondary text-sm">
                        {t('Law 03 — Conceal Your Intentions', 'নিয়ম ০৩')}
                      </Link>
                    </div>
                  </section>
                </div>
              )}

              {/* Assessment CTA */}
              <div className="mt-12 surface-card p-6 md:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg text-ink">
                    {t('Test your understanding', 'আপনার বোঝাপড়া যাচাই করুন')}
                  </h3>
                  <p className="mt-1.5 text-sm text-ink-muted">
                    {hasPublishedAssessment
                      ? t(
                          `${assessmentQuestionCount} questions to check what you learned from this lesson.`,
                          `এই পাঠ থেকে যা শিখেছেন তা যাচাই করতে ${assessmentQuestionCount}টি প্রশ্ন।`
                        )
                      : t(
                          'The assessment for this lesson has not been published yet.',
                          'এই পাঠের মূল্যায়ন এখনো প্রকাশ করা হয়নি।'
                        )}
                  </p>
                </div>

                {hasPublishedAssessment ? (
                  <Link
                    to={`/assessment/${law.slug}`}
                    className="btn-primary shrink-0"
                  >
                    {t('Take assessment', 'মূল্যায়ন নিন')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span
                    className="btn-primary shrink-0 cursor-not-allowed opacity-50"
                    aria-disabled="true"
                  >
                    {t('Assessment unavailable', 'মূল্যায়ন উপলব্ধ নয়')}
                  </span>
                )}
              </div>

              {/* Prev / Next */}
              <nav className="mt-12 pt-8 border-t border-line grid grid-cols-2 gap-4" aria-label="Lesson navigation">
                {prev ? (
                  <Link
                    to={`/laws/${prev.slug}`}
                    className="group surface-card p-5 flex items-center gap-3 hover:border-forest-300 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 text-ink-muted group-hover:text-forest-600 transition-colors shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-ink-muted">{t('Previous', 'পূর্ববর্তী')}</div>
                      <div className="font-display text-sm text-ink truncate group-hover:text-forest-600 transition-colors">
                        {language === 'en' ? prev.titleEn : prev.titleBn}
                      </div>
                    </div>
                  </Link>
                ) : <div />}
                {next ? (
                  <Link
                    to={`/laws/${next.slug}`}
                    className="group surface-card p-5 flex items-center justify-end gap-3 text-right hover:border-forest-300 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-ink-muted">{t('Next', 'পরবর্তী')}</div>
                      <div className="font-display text-sm text-ink truncate group-hover:text-forest-600 transition-colors">
                        {language === 'en' ? next.titleEn : next.titleBn}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-ink-muted group-hover:text-forest-600 transition-colors shrink-0" />
                  </Link>
                ) : <div />}
              </nav>
            </div>
          </article>
        </div>
      </div>

      {/* Mobile TOC drawer */}
      {tocOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setTocOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-surface border-l border-line shadow-soft overflow-y-auto thin-scroll animate-fade-up">
            <div className="flex items-center justify-between p-4 border-b border-line">
              <span className="eyebrow">{t('Contents', 'সূচি')}</span>
              <button onClick={() => setTocOpen(false)} className="btn-ghost p-1.5" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {sections && sections.map((s, i) => (
                <button
                  key={i}
                  onClick={() => scrollToSection(i)}
                  className={`block w-full text-left text-sm py-2.5 pl-3 border-l-2 transition-colors ${
                    activeSection === i
                      ? 'border-forest-500 text-forest-600 font-medium'
                      : 'border-line text-ink-muted'
                  }`}
                >
                  {language === 'en' ? s.headingEn : s.headingBn}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-ink-muted transition-colors ${
        active ? 'bg-forest-500 text-surface' : 'hover:bg-canvas-2 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
