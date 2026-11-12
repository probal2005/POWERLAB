import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Layers,
  ShieldCheck,
  Compass,
  ListChecks,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useContent } from '@/context/ContentContext';

export default function HomePage() {
  const { t, language } = useLanguage();
  const { laws, categories, loading, error } = useContent();
  const featuredNumbers = [1, 3, 5, 25, 35, 48];
  const featured = laws.filter(
    (law) => law.isPublished !== false && featuredNumbers.includes(law.number)
  );

  return (
    <div className={language === 'bn' ? 'font-bengali' : ''}>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="container-content pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 animate-fade-up">
              <span className="eyebrow text-bronze-500">{t('POWERLAB · Educational Reading Platform', 'POWERLAB · শৈক্ষিক পঠন প্ল্যাটফর্ম')}</span>
              <h1 className="mt-6 font-display text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.1] tracking-tightish text-ink max-w-3xl">
                {t('Understand Power. Recognize Influence. Think Strategically.', 'ক্ষমতা বুঝুন। প্রভাব চিনুন। কৌশলগতভাবে চিন্তা করুন।')}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-[1.7] text-ink-muted">
                {t(
                  'Explore 48 timeless principles of power through structured lessons, psychological insights, practical examples, and interactive assessments.',
                  'কাঠামোগত পাঠ, মনস্তাত্ত্বিক অন্তর্দৃষ্টি, ব্যবহারিক উদাহরণ এবং ইন্টারঅ্যাকটিভ মূল্যায়নের মাধ্যমে ক্ষমতার ৪৮টি শাশ্বত নীতি অন্বেষণ করুন।'
                )}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link to="/laws" className="btn-primary">
                  {t('Explore the 48 Laws', '৪৮ নিয়ম দেখুন')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#how-it-works" className="btn-secondary">
                  {t('How It Works', 'কীভাবে কাজ করে')}
                </a>
              </div>
              <div className="mt-12 flex items-center gap-8 text-sm text-ink-muted">
                <div>
                  <div className="font-display text-2xl text-forest-600">48</div>
                  <div className="mt-0.5">{t('Lessons', 'পাঠ')}</div>
                </div>
                <div className="h-8 w-px bg-line" />
                <div>
                  <div className="font-display text-2xl text-forest-600">2</div>
                  <div className="mt-0.5">{t('Languages', 'ভাষা')}</div>
                </div>
                <div className="h-8 w-px bg-line" />
                <div>
                  <div className="font-display text-2xl text-forest-600">{loading || error ? '—' : categories.length}</div>
                  <div className="mt-0.5">{t('Categories', 'বিভাগ')}</div>
                </div>
              </div>
            </div>

            {/* Editorial typography composition */}
            <div className="lg:col-span-5">
              <div className="relative surface-card p-8 md:p-10 shadow-soft">
                <div className="absolute top-0 left-0 h-1 w-16 bg-bronze-400" />
                <span className="eyebrow text-bronze-500">{t('From the Curriculum', 'পাঠ্যক্রম থেকে')}</span>
                <blockquote className="mt-5 font-display italic text-xl md:text-2xl leading-[1.45] text-ink">
                  {t(
                    '"Power is not a thing you hold. It is a current you learn to read — and sometimes, to redirect."',
                    '"ক্ষমতা এমন কিছু নয় যা আপনি ধরে রাখেন। এটি একটি স্রোত যা পড়তে শেখেন — এবং কখনো, পুনঃনির্দেশিত করেন।"'
                  )}
                </blockquote>
                <div className="mt-6 pt-6 border-t border-line">
                  <p className="text-sm text-ink-muted">
                    {t('Law 01 — Never Outshine the Master', 'নিয়ম ০১ — কখনো গুরুর চেয়ে বেশি উজ্জ্বল হবেন না')}
                  </p>
                  <Link
                    to="/laws/never-outshine-the-master"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-600 hover:text-forest-700 transition-colors"
                  >
                    {t('Read the lesson', 'পাঠটি পড়ুন')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Introduction to the 48 Laws */}
      <section className="border-b border-line">
        <div className="container-content py-20 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <span className="eyebrow text-bronze-500">{t('Introduction', 'ভূমিকা')}</span>
              <h2 className="mt-4 font-display text-3xl md:text-4xl leading-[1.2] tracking-tightish text-ink">
                {t('The 48 Laws, reimagined as a learning journey.', '৪৮ নিয়ম, এক শেখার যাত্রা হিসেবে।')}
              </h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <div className="space-y-5 text-[1.0625rem] leading-[1.75] text-ink/85">
                <p>
                  {t(
                    'The 48 Laws of Power is one of the most widely read books on strategy and human behavior. POWERLAB is not a substitute for that book. It is an independent educational companion — a structured way to study the underlying principles, test your understanding, and reflect on how these ideas appear in everyday life.',
                    'ক্ষমতার ৪৮ নিয়ম কৌশল এবং মানব আচরণের উপর সবচেয়ে ব্যাপকভাবে পঠিত বইগুলির একটি। POWERLAB সেই বইয়ের বিকল্প নয়। এটি একটি স্বাধীন শৈক্ষিক সঙ্গী — অন্তর্নিহিত নীতিগুলি অধ্যয়ন, আপনার বোঝাপড়া পরীক্ষা, এবং এই ধারণাগুলি কীভাবে প্রতিদিনের জীবনে প্রকাশ পায় তা চিন্তা করার একটি কাঠামোগত উপায়।'
                  )}
                </p>
                <p>
                  {t(
                    'Each lesson includes an original explanation, a psychological breakdown, real-life scenarios across university, workplace, and relationships, a defensive strategy for when these dynamics are used against you, and a self-assessment to check your understanding.',
                    'প্রতিটি পাঠে একটি মৌলিক ব্যাখ্যা, একটি মনস্তাত্ত্বিক বিশ্লেষণ, বিশ্ববিদ্যালয়, কর্মক্ষেত্র এবং সম্পর্ক জুড়ে বাস্তব পরিস্থিতি, যখন এই গতিশীলতা আপনার বিরুদ্ধে ব্যবহৃত হয় তখন একটি প্রতিরক্ষামূলক কৌশল, এবং আপনার বোঝাপড়া যাচাই করতে একটি স্ব-মূল্যায়ন অন্তর্ভুক্ত।'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Explore selected laws */}
      <section className="border-b border-line bg-canvas-2/40">
        <div className="container-content py-20 md:py-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="eyebrow text-bronze-500">{t('Featured Lessons', 'বৈশিষ্ট্যযুক্ত পাঠ')}</span>
              <h2 className="mt-4 font-display text-3xl md:text-4xl leading-[1.2] tracking-tightish text-ink">
                {t('Selected laws to begin with', 'শুরু করার জন্য নির্বাচিত নিয়ম')}
              </h2>
            </div>
            <Link to="/laws" className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-600 hover:text-forest-700 transition-colors">
              {t('View all 48', 'সব ৪৮ দেখুন')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-line border border-line rounded-sm overflow-hidden">
            {featured.map((law) => (
              <Link
                key={law.slug}
                to={`/laws/${law.slug}`}
                className="group bg-surface p-7 md:p-8 transition-colors hover:bg-canvas-2/50"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="font-display text-sm font-semibold text-bronze-500">
                    {t('Law', 'নিয়ম')} {String(law.number).padStart(2, '0')}
                  </span>
                  <ArrowRight className="h-4 w-4 text-ink-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="font-display text-xl leading-[1.3] text-ink group-hover:text-forest-600 transition-colors">
                  {language === 'en' ? law.titleEn : law.titleBn}
                </h3>
                <p className="mt-3 text-sm leading-[1.65] text-ink-muted line-clamp-3">
                  {language === 'en' ? law.shortEn : law.shortBn}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How the learning journey works */}
      <section id="how-it-works" className="border-b border-line">
        <div className="container-content py-20 md:py-24">
          <div className="max-w-2xl mb-12">
            <span className="eyebrow text-bronze-500">{t('How It Works', 'কীভাবে কাজ করে')}</span>
            <h2 className="mt-4 font-display text-3xl md:text-4xl leading-[1.2] tracking-tightish text-ink">
              {t('A structured path from reading to mastery', 'পঠন থেকে দক্ষতা পর্যন্ত একটি কাঠামোগত পথ')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-sm overflow-hidden">
            {[
              { icon: BookOpen, title: t('Read', 'পড়ুন'), desc: t('Study the lesson with original commentary, psychological analysis, and real-life examples.', 'মৌলিক ভাষ্য, মনস্তাত্ত্বিক বিশ্লেষণ এবং বাস্তব উদাহরণ সহ পাঠ অধ্যয়ন করুন।') },
              { icon: Brain, title: t('Reflect', 'চিন্তা করুন'), desc: t('Consider defensive strategies and ethical boundaries before applying any principle.', 'যেকোনো নীতি প্রয়োগ করার আগে প্রতিরক্ষামূলক কৌশল এবং নৈতিক সীমা বিবেচনা করুন।') },
              { icon: ListChecks, title: t('Assess', 'মূল্যায়ন করুন'), desc: t('Test your understanding with five targeted questions and receive immediate explanations.', 'পাঁচটি লক্ষ্যবস্তু প্রশ্ন দিয়ে আপনার বোঝাপড়া পরীক্ষা করুন এবং তাৎক্ষণিক ব্যাখ্যা পান।') },
              { icon: Compass, title: t('Track', 'ট্র্যাক করুন'), desc: t('Bookmark lessons, take notes, and follow your progress through all 48 laws.', 'পাঠ বুকমার্ক করুন, নোট নিন, এবং সব ৪৮ নিয়ম জুড়ে আপনার অগ্রগতি অনুসরণ করুন।') },
            ].map((step, i) => (
              <div key={i} className="bg-surface p-7 md:p-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-forest-50 text-forest-600">
                  <step.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="mt-5 font-display text-xs font-semibold text-bronze-500">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="mt-2 font-display text-lg text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-[1.65] text-ink-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Learning methodology */}
      <section className="border-b border-line bg-canvas-2/40">
        <div className="container-content py-20 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <span className="eyebrow text-bronze-500">{t('Methodology', 'পদ্ধতি')}</span>
              <h2 className="mt-4 font-display text-3xl md:text-4xl leading-[1.2] tracking-tightish text-ink">
                {t('How each lesson is structured', 'প্রতিটি পাঠ কীভাবে সাজানো')}
              </h2>
              <p className="mt-5 text-[1.0625rem] leading-[1.75] text-ink-muted">
                {t(
                  'Every lesson follows the same nine-part structure so you always know where you are. Sections build from foundational explanation to ethical reflection, giving you a complete picture of each principle.',
                  'প্রতিটি পাঠ একই নয়-অংশের কাঠামো অনুসরণ করে যাতে আপনি সবসময় জানেন কোথায় আছেন। বিভাগগুলি মৌলিক ব্যাখ্যা থেকে নৈতিক প্রতিফলন পর্যন্ত গড়ে ওঠে, প্রতিটি নীতির একটি সম্পূর্ণ চিত্র দেয়।'
                )}
              </p>
            </div>
            <div className="lg:col-span-7">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-line border border-line rounded-sm overflow-hidden">
                {[
                  t('Introduction', 'ভূমিকা'),
                  t('Core Principle', 'মূল নীতি'),
                  t('Psychological Explanation', 'মনস্তাত্ত্বিক ব্যাখ্যা'),
                  t('Real-Life Examples', 'বাস্তব উদাহরণ'),
                  t('Practical Application', 'ব্যবহারিক প্রয়োগ'),
                  t('Defensive Strategy', 'প্রতিরক্ষামূলক কৌশল'),
                  t('When Not to Apply', 'যখন প্রয়োগ করা উচিত নয়'),
                  t('Ethical Considerations', 'নৈতিক বিবেচনা'),
                ].map((label, i) => (
                  <li key={i} className="bg-surface px-5 py-4 flex items-center gap-3">
                    <span className="font-display text-xs font-semibold text-bronze-500 w-6">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm text-ink/85">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why understanding human behavior matters */}
      <section className="border-b border-line">
        <div className="container-content py-20 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6">
              <span className="eyebrow text-bronze-500">{t('Why This Matters', 'কেন এটি গুরুত্বপূর্ণ')}</span>
              <h2 className="mt-4 font-display text-3xl md:text-4xl leading-[1.2] tracking-tightish text-ink">
                {t('Understanding behavior is a defensive skill', 'আচরণ বোঝা একটি প্রতিরক্ষামূলক দক্ষতা')}
              </h2>
              <div className="mt-5 space-y-4 text-[1.0625rem] leading-[1.75] text-ink/85">
                <p>
                  {t(
                    'The principles explored here are not instructions for manipulation. They are patterns — patterns that describe how influence, ambition, and insecurity already shape the world around you.',
                    'এখানে অন্বেষণ করা নীতিগুলি ম্যানিপুলেশনের নির্দেশ নয়। এগুলি ধরণ — ধরণ যা বর্ণনা করে প্রভাব, উচ্চাকাঙ্ক্ষা এবং অনিশ্চয়তা কীভাবে ইতিমধ্যে আপনার চারপাশের বিশ্ব গঠন করে।'
                  )}
                </p>
                <p>
                  {t(
                    'Studying them helps you recognize these dynamics when they are used on you, set boundaries with awareness, and make more deliberate choices about your own conduct.',
                    'এগুলি অধ্যয়ন করা আপনাকে সাহায্য করে এই গতিশীলতা চিনতে যখন সেগুলি আপনার উপর ব্যবহৃত হয়, সচেতনতার সাথে সীমা নির্ধারণ করতে, এবং আপনার নিজের আচরণ সম্পর্কে আরও ইচ্ছাকৃত পছন্দ করতে।'
                  )}
                </p>
              </div>
            </div>
            <div className="lg:col-span-5 lg:col-start-8">
              <div className="grid grid-cols-1 gap-px bg-line border border-line rounded-sm overflow-hidden">
                {[
                  { icon: ShieldCheck, title: t('Recognize influence tactics', 'প্রভাবের কৌশল চিনুন'), desc: t('See patterns before they affect your decisions.', 'সিদ্ধান্ত প্রভাবিত হওয়ার আগে ধরণ দেখুন।') },
                  { icon: Layers, title: t('Think in systems', 'ব্যবস্থায় চিন্তা করুন'), desc: t('Understand how actions ripple through groups.', 'বোঝুন কাজ কীভাবে দলে ছড়িয়ে পড়ে।') },
                  { icon: GraduationCap, title: t('Learn with ethics', 'নৈতিকতার সাথে শিখুন'), desc: t('Every lesson includes ethical reflection.', 'প্রতিটি পাঠে নৈতিক প্রতিফলন আছে।') },
                ].map((item, i) => (
                  <div key={i} className="bg-surface p-6 flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-bronze-50 text-bronze-500">
                      <item.icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="font-display text-base text-ink">{item.title}</h3>
                      <p className="mt-1 text-sm leading-[1.6] text-ink-muted">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured reading section */}
      <section className="border-b border-line bg-canvas-2/40">
        <div className="container-content py-20 md:py-24">
          <div className="max-w-2xl mb-10">
            <span className="eyebrow text-bronze-500">{t('Featured Reading', 'বৈশিষ্ট্যযুক্ত পঠন')}</span>
            <h2 className="mt-4 font-display text-3xl md:text-4xl leading-[1.2] tracking-tightish text-ink">
              {t('A closer look at one principle', 'একটি নীতির নিকটতম দৃষ্টি')}
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-line border border-line rounded-sm overflow-hidden">
            <div className="lg:col-span-7 bg-surface p-8 md:p-10">
              <span className="eyebrow text-bronze-500">{t('Law 03', 'নিয়ম ০৩')}</span>
              <h3 className="mt-3 font-display text-2xl md:text-3xl leading-[1.25] text-ink">
                {t('Conceal Your Intentions', 'আপনার উদ্দেশ্য গোপন রাখুন')}
              </h3>
              <p className="mt-5 text-[1.0625rem] leading-[1.75] text-ink/85">
                {t(
                  'When people know what you want, they can prepare defenses, set prices, or rearrange the field to their advantage. Keeping your aims ambiguous is not about dishonesty for its own sake; it is about preserving the freedom to maneuver until the moment is right.',
                  'যখন মানুষ জানে আপনি কী চান, তারা প্রতিরক্ষা প্রস্তুত করতে, দাম নির্ধারণ করতে, বা মাঠ তাদের সুবিধায় সাজাতে পারে। আপনার উদ্দেশ্য অস্পষ্ট রাখা নিজের জন্য অসততা নয়; এটি সঠিক মুহূর্ত পর্যন্ত চাল চলার স্বাধীনতা সংরক্ষণের বিষয়।'
                )}
              </p>
              <Link
                to="/laws/conceal-your-intentions"
                className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-600 hover:text-forest-700 transition-colors"
              >
                {t('Continue reading', 'পড়তে থাকুন')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="lg:col-span-5 bg-canvas-2/60 p-8 md:p-10 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-bronze-500">
                <Sparkles className="h-4 w-4" />
                <span className="eyebrow">{t('Reader Tools', 'পাঠকের সরঞ্জাম')}</span>
              </div>
              <ul className="mt-5 space-y-3.5 text-sm text-ink/85">
                <li className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-bronze-400" />{t('Font-size and reading-width controls', 'ফন্ট-সাইজ এবং পঠন-প্রস্থ নিয়ন্ত্রণ')}</li>
                <li className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-bronze-400" />{t('English / Bengali switching per lesson', 'প্রতি পাঠে ইংরেজি / বাংলা পরিবর্তন')}</li>
                <li className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-bronze-400" />{t('Bookmark and mark-as-completed', 'বুকমার্ক এবং সম্পূর্ণ হিসেবে চিহ্নিত')}</li>
                <li className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-bronze-400" />{t('Table of contents and lesson navigation', 'সূচি এবং পাঠ নেভিগেশন')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section>
        <div className="container-content py-20 md:py-28">
          <div className="relative surface-card overflow-hidden p-10 md:p-16 text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-20 bg-bronze-400" />
            <span className="eyebrow text-bronze-500">{t('Begin', 'শুরু')}</span>
            <h2 className="mt-5 mx-auto max-w-2xl font-display text-3xl md:text-4xl leading-[1.2] tracking-tightish text-ink">
              {t('Start with the first law, or explore the full directory.', 'প্রথম নিয়ম দিয়ে শুরু করুন, বা সম্পূর্ণ তালিকা দেখুন।')}
            </h2>
            <p className="mt-5 mx-auto max-w-xl text-ink-muted leading-[1.7]">
              {t('Reading is free and requires no account. Sign up only when you want to track progress, save bookmarks, and review your assessment history.', 'পঠন বিনামূল্যে এবং কোনো হিসাব প্রয়োজন নেই। অগ্রগতি ট্র্যাক করতে, বুকমার্ক সংরক্ষণ এবং মূল্যায়ন ইতিহাস পর্যালোচনা করতে চাইলেই নিবন্ধন করুন।')}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to="/laws" className="btn-primary">
                {t('Explore the 48 Laws', '৪৮ নিয়ম দেখুন')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/register" className="btn-secondary">
                {t('Create an account', 'হিসাব তৈরি করুন')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
