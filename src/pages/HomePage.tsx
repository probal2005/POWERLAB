import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, Compass } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useContent } from '@/context/ContentContext';
import PsychologyCarousel from '@/components/PsychologyCarousel';

export default function HomePage() {
  const { t, tx, language } = useLanguage();
  const { laws, categories, loading, error } = useContent();
  const featuredNumbers = [1, 3, 25];
  const featured = laws
    .filter((law) => law.isPublished !== false && featuredNumbers.includes(law.number))
    .sort((a, b) => a.number - b.number);

  return (
    <div className={language === 'bn' ? 'font-bengali' : ''}>
      <section className="border-b border-line">
        <div className="container-content py-16 md:py-24">
          <div className="max-w-3xl">
            <span className="eyebrow text-bronze-500">
              {t('POWERLAB · An independent learning platform', 'POWERLAB · একটি স্বাধীন শিক্ষামূলক প্ল্যাটফর্ম')}
            </span>
            <h1 className="mt-5 font-display text-4xl leading-[1.1] tracking-tightish text-ink sm:text-5xl lg:text-[3.5rem]">
              {t('Understand power. Recognize influence. Think strategically.', 'ক্ষমতা বুঝুন। প্রভাব চিনুন। কৌশলগতভাবে ভাবুন।')}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-[1.7] text-ink-muted">
              {t(
                'Explore the 48 laws through clear explanations, practical examples, and ethical reflection.',
                'স্পষ্ট ব্যাখ্যা, ব্যবহারিক উদাহরণ এবং নৈতিক পর্যালোচনার মাধ্যমে ক্ষমতার ৪৮টি নিয়ম জানুন।'
              )}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/laws" className="btn-primary">
                {t('Explore the 48 Laws', '৪৮টি নিয়ম দেখুন')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/about" className="btn-secondary">
                {t('About POWERLAB', 'POWERLAB সম্পর্কে')}
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line pt-5 text-sm text-ink-muted">
              <span><strong className="font-display text-lg text-forest-600">48</strong> {t('laws', 'টি নিয়ম')}</span>
              <span><strong className="font-display text-lg text-forest-600">2</strong> {t('languages', 'টি ভাষা')}</span>
              <span><strong className="font-display text-lg text-forest-600">{loading || error ? '—' : categories.length}</strong> {t('categories', 'টি বিভাগ')}</span>
            </div>
          </div>
        </div>
      </section>

      <PsychologyCarousel />

      <section className="border-b border-line bg-canvas-2/40">
        <div className="container-content py-14 md:py-16">
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="eyebrow text-bronze-500">{t('Featured lessons', 'নির্বাচিত পাঠ')}</span>
              <h2 className="mt-2 font-display text-3xl leading-tight tracking-tightish text-ink">
                {t('A few places to start', 'শুরু করার কয়েকটি পথ')}
              </h2>
            </div>
            <Link to="/laws" className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-600 hover:text-forest-700">
              {t('View all 48 laws', 'সব ৪৮টি নিয়ম দেখুন')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <p className="border-t border-line py-8 text-sm text-ink-muted" role="status">
              {t('Loading featured laws…', 'নির্বাচিত নিয়ম লোড হচ্ছে…')}
            </p>
          ) : featured.length > 0 ? (
            <div className="grid gap-px overflow-hidden rounded-sm border border-line bg-line md:grid-cols-3">
              {featured.map((law) => (
                <Link
                  key={law.slug}
                  to={`/laws/${law.slug}`}
                  className="group bg-surface p-6 transition-colors hover:bg-canvas-2/50 md:p-7"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-display text-sm font-semibold text-bronze-500">
                      {t('Law', 'নিয়ম')} {String(law.number).padStart(2, '0')}
                    </span>
                    <ArrowRight className="h-4 w-4 text-ink-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </div>
                  <h3 className="font-display text-lg leading-snug text-ink group-hover:text-forest-600">
                    {tx(`law:${law.slug}:title`, law.titleEn, law.titleBn)}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                    {tx(`law:${law.slug}:short`, law.shortEn, law.shortBn)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="border-t border-line py-8 text-sm text-ink-muted" role={error ? 'alert' : undefined}>
              {error
                ? t('Featured lessons could not be loaded. Browse the full directory instead.', 'নির্বাচিত পাঠ লোড হয়নি। সম্পূর্ণ তালিকা দেখুন।')
                : t('No featured lessons are available yet. Browse all 48 laws.', 'এখনও নির্বাচিত পাঠ নেই। সব ৪৮টি নিয়ম দেখুন।')}
            </p>
          )}
        </div>
      </section>

      <section className="border-b border-line">
        <div className="container-content py-14 md:py-16">
          <div className="mb-7 max-w-2xl">
            <span className="eyebrow text-bronze-500">{t('A thoughtful way to learn', 'ভেবে শেখার একটি পদ্ধতি')}</span>
            <h2 className="mt-2 font-display text-3xl leading-tight tracking-tightish text-ink">
              {t('Read. Reflect. Apply with care.', 'পড়ুন। ভাবুন। বুঝে প্রয়োগ করুন।')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              {t(
                'POWERLAB treats these principles as ideas to examine—not instructions to manipulate people.',
                'POWERLAB এই নীতিগুলোকে যাচাই করার ধারণা হিসেবে দেখে—মানুষকে প্রভাবিত করার নির্দেশ হিসেবে নয়।'
              )}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: BookOpen, title: t('Read', 'পড়ুন'), text: t('Explore concise lessons with real-world examples.', 'বাস্তব উদাহরণসহ সংক্ষিপ্ত পাঠ পড়ুন।') },
              { icon: Brain, title: t('Reflect', 'ভাবুন'), text: t('Consider context, ethics, and how influence works.', 'প্রেক্ষাপট, নৈতিকতা ও প্রভাব কীভাবে কাজ করে তা ভাবুন।') },
              { icon: Compass, title: t('Continue', 'এগিয়ে যান'), text: t('Save your place and track learning when you sign in.', 'সাইন ইন করে পড়ার অগ্রগতি ও বুকমার্ক সংরক্ষণ করুন।') },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4 rounded-sm border border-line bg-surface p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-forest-50 text-forest-600">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="font-display text-lg text-ink">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container-content py-14 md:py-16">
          <div className="surface-card relative overflow-hidden p-7 text-center sm:p-10">
            <div className="absolute left-1/2 top-0 h-1 w-16 -translate-x-1/2 bg-bronze-400" />
            <span className="eyebrow text-bronze-500">{t('Begin', 'শুরু করুন')}</span>
            <h2 className="mx-auto mt-3 max-w-2xl font-display text-2xl leading-tight tracking-tightish text-ink sm:text-3xl">
              {t('Start with one law. Build your own perspective.', 'একটি নিয়ম দিয়ে শুরু করুন। নিজের দৃষ্টিভঙ্গি গড়ুন।')}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
              {t('Reading is free. Create an account only if you want to save bookmarks and track your learning.', 'পড়া বিনামূল্যে। বুকমার্ক ও অগ্রগতি সংরক্ষণ করতে চাইলে অ্যাকাউন্ট খুলুন।')}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/laws" className="btn-primary">
                {t('Explore the laws', 'নিয়মগুলো দেখুন')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/register" className="btn-secondary">{t('Create an account', 'অ্যাকাউন্ট খুলুন')}</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
