import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function AboutPage() {
  const { t, language } = useLanguage();

  const principles = [
    {
      icon: BookOpen,
      title: t('Structured Learning', 'সুশৃঙ্খল শিক্ষা'),
      description: t(
        'Explore each principle through organized lessons and carefully structured explanations.',
        'সুসংগঠিত পাঠ এবং বিস্তারিত ব্যাখ্যার মাধ্যমে প্রতিটি নীতি অন্বেষণ করুন।'
      ),
    },
    {
      icon: Brain,
      title: t('Psychological Understanding', 'মনস্তাত্ত্বিক উপলব্ধি'),
      description: t(
        'Understand the human behavior, motivations, and social dynamics behind different principles.',
        'বিভিন্ন নীতির পেছনের মানব আচরণ, প্রেরণা এবং সামাজিক গতিশীলতা বুঝুন।'
      ),
    },
    {
      icon: ShieldCheck,
      title: t('Critical Thinking', 'সমালোচনামূলক চিন্তাভাবনা'),
      description: t(
        'Learn to recognize influence, evaluate situations, and consider the ethical implications of strategic behavior.',
        'প্রভাব চিনতে, পরিস্থিতি মূল্যায়ন করতে এবং কৌশলগত আচরণের নৈতিক দিক বিবেচনা করতে শিখুন।'
      ),
    },
  ];

  return (
    <div className={language === 'bn' ? 'font-bengali' : ''}>
      <section className="border-b border-line">
        <div className="container-content py-16 md:py-24">
          <span className="eyebrow text-bronze-500">
            {t('ABOUT POWERLAB', 'POWERLAB সম্পর্কে')}
          </span>

          <h1 className="mt-5 max-w-3xl font-display text-4xl leading-tight tracking-tightish text-ink md:text-5xl">
            {t(
              'A thoughtful approach to understanding power and human behavior.',
              'ক্ষমতা এবং মানব আচরণ বোঝার একটি চিন্তাশীল পদ্ধতি।'
            )}
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-[1.85] text-ink-muted">
            {t(
              'POWERLAB is an independent educational reading platform designed to help learners explore the principles of influence, social dynamics, strategic thinking, and human behavior.',
              'POWERLAB একটি স্বতন্ত্র শিক্ষামূলক পাঠের প্ল্যাটফর্ম, যেখানে শিক্ষার্থীরা প্রভাব, সামাজিক সম্পর্ক, কৌশলগত চিন্তাভাবনা এবং মানব আচরণের বিভিন্ন নীতি অন্বেষণ করতে পারেন।'
            )}
          </p>

          <div className="mt-9">
            <Link to="/laws" className="btn-primary">
              {t('Explore the 48 Laws', '৪৮টি নিয়ম অন্বেষণ করুন')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="container-content py-16 md:py-20">
        <div className="max-w-3xl">
          <span className="eyebrow text-bronze-500">
            {t('OUR APPROACH', 'আমাদের পদ্ধতি')}
          </span>

          <h2 className="mt-4 font-display text-3xl text-ink md:text-4xl">
            {t('Learning beyond the headlines', 'শুধু শিরোনামের বাইরে শেখা')}
          </h2>

          <p className="mt-6 leading-[1.85] text-ink-muted">
            {t(
              'Understanding a principle requires more than memorizing its title. POWERLAB is designed around detailed reading, psychological context, practical situations, critical reflection, and self-assessment.',
              'কোনো নীতি বুঝতে শুধু তার শিরোনাম মুখস্থ করাই যথেষ্ট নয়। POWERLAB তৈরি করা হয়েছে বিস্তারিত পাঠ, মনস্তাত্ত্বিক প্রেক্ষাপট, বাস্তব পরিস্থিতি, সমালোচনামূলক চিন্তা এবং আত্মমূল্যায়নের সমন্বয়ে।'
            )}
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {principles.map(({ icon: Icon, title, description }) => (
            <article key={title} className="surface-card p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-forest-500/10 text-forest-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-xl text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-[1.8] text-ink-muted">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-canvas-2">
        <div className="container-content py-14 md:py-16">
          <div className="max-w-3xl">
            <span className="eyebrow text-bronze-500">
              {t('INDEPENDENT EDUCATIONAL PROJECT', 'স্বতন্ত্র শিক্ষামূলক প্রকল্প')}
            </span>

            <h2 className="mt-4 font-display text-2xl text-ink">
              {t('An independent learning resource', 'একটি স্বতন্ত্র শিক্ষার মাধ্যম')}
            </h2>

            <p className="mt-4 text-sm leading-[1.85] text-ink-muted">
              {t(
                'POWERLAB is an independent educational project inspired by themes discussed in The 48 Laws of Power by Robert Greene. It is not affiliated with, endorsed by, or officially connected to the author or publisher. Educational explanations and learning materials are intended to provide original commentary and critical perspectives.',
                'POWERLAB রবার্ট গ্রিনের The 48 Laws of Power বইয়ে আলোচিত বিষয়বস্তু থেকে অনুপ্রাণিত একটি স্বতন্ত্র শিক্ষামূলক প্রকল্প। এটি লেখক বা প্রকাশকের সঙ্গে আনুষ্ঠানিকভাবে যুক্ত নয় কিংবা তাঁদের দ্বারা অনুমোদিত নয়। এখানে শিক্ষামূলক ব্যাখ্যা ও উপকরণ মৌলিক আলোচনা এবং সমালোচনামূলক দৃষ্টিভঙ্গি প্রদানের উদ্দেশ্যে তৈরি।'
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
