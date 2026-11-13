import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useContent } from '@/context/ContentContext';

type SortKey = 'number' | 'title';

export default function LawsPage() {
  const { t, language } = useLanguage();
  const { laws, categories, loading, error } = useContent();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('number');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = laws.filter((law) => law.isPublished !== false).filter((law) => {
      const matchesQuery =
        !q ||
        law.titleEn.toLowerCase().includes(q) ||
        law.titleBn.includes(q) ||
        law.shortEn.toLowerCase().includes(q) ||
        law.shortBn.includes(q) ||
        String(law.number) === q;
      const matchesCat = category === 'all' || law.category === category;
      return matchesQuery && matchesCat;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'title') {
        const ta = language === 'en' ? a.titleEn : a.titleBn;
        const tb = language === 'en' ? b.titleEn : b.titleBn;
        return ta.localeCompare(tb);
      }
      return a.number - b.number;
    });
    return list;
  }, [laws, query, category, sort, language]);

  const activeCat = categories.find((c) => c.id === category);

  return (
    <div className={language === 'bn' ? 'font-bengali' : ''}>
      {/* Header */}
      <section className="border-b border-line">
        <div className="container-content py-14 md:py-16">
          <span className="eyebrow text-bronze-500">{t('The Directory', 'তালিকা')}</span>
          <h1 className="mt-4 font-display text-4xl md:text-5xl leading-[1.1] tracking-tightish text-ink max-w-3xl">
            {t('The 48 Laws of Power', 'ক্ষমতার ৪৮ নিয়ম')}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-[1.7] text-ink-muted">
            {t(
              'Browse all 48 lessons. Each opens a dedicated reading page with original commentary, examples, and a self-assessment.',
              'সব ৪৮ পাঠ ব্রাউজ করুন। প্রতিটি মৌলিক ভাষ্য, উদাহরণ এবং স্ব-মূল্যায়ন সহ একটি নিবেদিত পঠন পৃষ্ঠা খোলে।'
            )}
          </p>
        </div>
      </section>

      {/* Controls */}
      <section className="sticky top-16 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="container-content py-3.5">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('Search by title or keyword…', 'শিরোনাম বা কীওয়ার্ড দিয়ে খুঁজুন…')}
                className="w-full rounded-full border border-line bg-surface pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-forest-300 focus:outline-none transition-colors"
                aria-label="Search laws"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters((o) => !o)}
              className={`btn-ghost border border-line px-3.5 ${showFilters ? 'text-forest-600 border-forest-300' : ''}`}
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">{t('Filters', 'ফিল্টার')}</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 flex flex-col gap-4 pb-1 animate-fade-up">
              <div>
                <div className="eyebrow mb-2.5">{t('Category', 'বিভাগ')}</div>
                <div className="flex flex-wrap gap-2">
                  <FilterChip active={category === 'all'} onClick={() => setCategory('all')}>
                    {t('All', 'সব')}
                  </FilterChip>
                  {categories.map((c) => (
                    <FilterChip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                      {language === 'en' ? c.labelEn : c.labelBn}
                    </FilterChip>
                  ))}
                </div>
              </div>
              <div>
                <div className="eyebrow mb-2.5">{t('Sort by', 'সাজানো')}</div>
                <div className="flex flex-wrap gap-2">
                  <FilterChip active={sort === 'number'} onClick={() => setSort('number')}>
                    {t('Law number', 'নিয়ম নম্বর')}
                  </FilterChip>
                  <FilterChip active={sort === 'title'} onClick={() => setSort('title')}>
                    {t('Title A–Z', 'শিরোনাম ক–য়')}
                  </FilterChip>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* List */}
      <section>
        <div className="container-content py-10 md:py-12">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-ink-muted">
              {loading ? '—' : filtered.length} {t('of', 'এর মধ্যে')} 48 {t('laws', 'নিয়ম')}
              {activeCat && ` · ${language === 'en' ? activeCat.labelEn : activeCat.labelBn}`}
            </p>
            {(query || category !== 'all') && (
              <button
                onClick={() => { setQuery(''); setCategory('all'); }}
                className="text-sm text-forest-600 hover:text-forest-700 font-medium"
              >
                {t('Reset', 'পুনঃস্থাপন')}
              </button>
            )}
          </div>

          {loading ? (
            <p role="status" className="border-t border-line py-16 text-center text-sm text-ink-muted">
              {t('Loading the law directory…', 'নিয়মের তালিকা লোড হচ্ছে…')}
            </p>
          ) : error && laws.length === 0 ? (
            <p role="alert" className="border-t border-line py-16 text-center text-sm text-error">
              {t('The law directory could not be loaded. Please refresh the page and try again.', 'নিয়মের তালিকা লোড হয়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।')}
            </p>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-display text-xl text-ink">{t('No laws match your search.', 'আপনার অনুসন্ধানে কোনো নিয়ম মেলে নি।')}</p>
              <p className="mt-2 text-sm text-ink-muted">{t('Try a different keyword or reset the filters.', 'ভিন্ন কীওয়ার্ড চেষ্টা করুন বা ফিল্টার পুনঃস্থাপন করুন।')}</p>
            </div>
          ) : (
            <div className="border-t border-line">
              {error && (
                <p role="status" className="py-3 text-sm text-ink-muted">
                  {t('Showing saved laws while the latest content refreshes.', 'সর্বশেষ বিষয়বস্তু হালনাগাদ হওয়ার সময় সংরক্ষিত নিয়ম দেখানো হচ্ছে।')}
                </p>
              )}
              {filtered.map((law) => (
                <Link
                  key={law.slug}
                  to={`/laws/${law.slug}`}
                  className="group grid grid-cols-12 gap-4 items-start py-6 border-b border-line transition-colors hover:bg-canvas-2/40 -mx-2 px-2 rounded-sm"
                >
                  <div className="col-span-2 sm:col-span-1">
                    <span className="font-display text-2xl text-bronze-500 font-semibold">
                      {String(law.number).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="col-span-10 sm:col-span-8">
                    <h3 className="font-display text-lg md:text-xl leading-[1.3] text-ink group-hover:text-forest-600 transition-colors">
                      {language === 'en' ? law.titleEn : law.titleBn}
                    </h3>
                    <p className="mt-2 text-sm leading-[1.65] text-ink-muted max-w-2xl line-clamp-2">
                      {language === 'en' ? law.shortEn : law.shortBn}
                    </p>
                  </div>
                  <div className="hidden sm:flex col-span-3 items-center justify-end gap-2">
                    <span className="text-xs text-ink-muted">
                      {(() => {
                        const c = categories.find((c) => c.id === law.category);
                        return c ? (language === 'en' ? c.labelEn : c.labelBn) : law.category;
                      })()}
                    </span>
                    <ArrowRight className="h-4 w-4 text-ink-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
        active
          ? 'bg-forest-500 text-surface border-forest-500'
          : 'bg-surface text-ink/80 border-line hover:border-forest-300 hover:text-forest-600'
      }`}
    >
      {children}
    </button>
  );
}
