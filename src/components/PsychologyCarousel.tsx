import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play, Quote } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

type Perspective = {
  name: string;
  work: string;
  source: string;
  titleEn: string;
  titleBn: string;
  ideaEn: string;
  ideaBn: string;
};

const perspectives: Perspective[] = [
  {
    name: 'William James',
    work: 'The Principles of Psychology · 1890',
    source: 'https://psychclassics.yorku.ca/James/Principles/prin4.htm',
    titleEn: 'Habits shape everyday action',
    titleBn: 'অভ্যাস প্রতিদিনের আচরণ গড়ে',
    ideaEn: 'Repeated actions become easier to repeat. Small routines can gradually shape how we respond.',
    ideaBn: 'বারবার করা কাজ আবার করা সহজ করে। ছোট রুটিন ধীরে ধীরে আমাদের প্রতিক্রিয়ার ধরন গড়ে তোলে।',
  },
  {
    name: 'Carl Rogers',
    work: 'On Becoming a Person · 1961',
    source: 'https://www.panarchy.org/rogers/person.html',
    titleEn: 'Growth is a continuing process',
    titleBn: 'বিকাশ একটি চলমান প্রক্রিয়া',
    ideaEn: 'Rogers described a good life as movement and growth, rather than a fixed state we finally reach.',
    ideaBn: 'রজার্সের ধারণায় ভালো জীবন কোনো চূড়ান্ত অবস্থা নয়; এটি চলমান পরিবর্তন ও বিকাশের পথ।',
  },
  {
    name: 'Alfred Adler',
    work: 'What Life Should Mean to You · 1931',
    source: 'https://adler.school/archivo/adler/original/1931%20What%20Life%20Should%20Mean%20to%20You',
    titleEn: 'Belonging and contribution matter',
    titleBn: 'সম্পর্ক ও অবদান গুরুত্বপূর্ণ',
    ideaEn: 'Adler emphasized social interest: well-being is connected to cooperation, belonging, and contributing to others.',
    ideaBn: 'অ্যাডলার সামাজিক আগ্রহের ওপর জোর দেন: সুস্থতা সহযোগিতা, অন্তর্ভুক্তি ও অন্যদের জন্য অবদানের সঙ্গে জড়িত।',
  },
  {
    name: 'Abraham Maslow',
    work: 'A Theory of Human Motivation · 1943',
    source: 'https://psychclassics.yorku.ca/Maslow/motivation.htm',
    titleEn: 'Needs influence motivation',
    titleBn: 'প্রয়োজন প্রেরণাকে প্রভাবিত করে',
    ideaEn: 'What draws our attention can shift with the needs and circumstances that feel most pressing.',
    ideaBn: 'যে প্রয়োজন ও পরিস্থিতি সবচেয়ে জরুরি মনে হয়, তার সঙ্গে আমাদের মনোযোগ ও প্রেরণা বদলাতে পারে।',
  },
  {
    name: 'B. F. Skinner',
    work: 'Science and Human Behavior · 1953',
    source: 'https://www.bfskinner.org/publications/books/',
    titleEn: 'Consequences shape behavior',
    titleBn: 'পরিণতি আচরণকে প্রভাবিত করে',
    ideaEn: 'The outcomes that follow an action can affect how likely that action is to happen again.',
    ideaBn: 'কোনো কাজের পর যে ফল আসে, তা কাজটি আবার ঘটার সম্ভাবনাকে প্রভাবিত করতে পারে।',
  },
  {
    name: 'Viktor Frankl',
    work: "Man's Search for Meaning · 1946",
    source: 'https://www.beacon.org/Assets/ClientPages/MansSearchForMeaningtg.aspx',
    titleEn: 'Meaning can guide a response',
    titleBn: 'অর্থবোধ প্রতিক্রিয়ার পথ দেখাতে পারে',
    ideaEn: 'Frankl’s work explored how a sense of meaning can help people face hardship and choose a response.',
    ideaBn: 'ফ্র্যাঙ্কলের কাজ দেখায়, অর্থবোধ মানুষকে কঠিন সময়ের মুখোমুখি হতে এবং নিজের প্রতিক্রিয়া বেছে নিতে সাহায্য করতে পারে।',
  },
  {
    name: 'Jean Piaget',
    work: 'To Understand Is to Invent · 1973',
    source: 'https://unesdoc.unesco.org/ark:/48223/pf0000006133',
    titleEn: 'Learning involves active discovery',
    titleBn: 'শেখায় সক্রিয়ভাবে আবিষ্কার জড়িত',
    ideaEn: 'Piaget’s account of learning stresses how people build and revise understanding through experience.',
    ideaBn: 'পিয়াজের শেখার ধারণায় অভিজ্ঞতার মধ্য দিয়ে মানুষ নিজের বোঝাপড়া গড়ে তোলে ও সংশোধন করে।',
  },
  {
    name: 'Lev Vygotsky',
    work: 'Mind in Society · 1978',
    source: 'https://home.fau.edu/musgrove/web/vygotsky1978.pdf',
    titleEn: 'Support can extend learning',
    titleBn: 'সহায়তা শেখার পরিসর বাড়ায়',
    ideaEn: 'Guidance and collaboration can help a learner do more than they can manage alone at that moment.',
    ideaBn: 'নির্দেশনা ও সহযোগিতা শিক্ষার্থীকে সেই মুহূর্তে একা যতটা পারে তার চেয়ে বেশি শিখতে সাহায্য করতে পারে।',
  },
  {
    name: 'Kurt Lewin',
    work: 'Principles of Topological Psychology · 1936',
    source: 'https://books.google.com/books?id=ZSkFAQAAIAAJ',
    titleEn: 'Behavior depends on person and situation',
    titleBn: 'আচরণ ব্যক্তি ও পরিস্থিতি—দুটির ওপর নির্ভর করে',
    ideaEn: 'Lewin’s field theory asks us to understand behavior in relation to both the person and their environment.',
    ideaBn: 'লুইনের ফিল্ড তত্ত্ব অনুযায়ী আচরণ বুঝতে ব্যক্তি ও তার পরিবেশ—দুটিকেই বিবেচনা করতে হয়।',
  },
];

export default function PsychologyCarousel() {
  const { t, language } = useLanguage();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPaused(true);
    }
  }, []);

  useEffect(() => {
    if (paused || hovered || focused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % perspectives.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [paused, hovered, focused]);

  const current = perspectives[index];
  const previous = () => setIndex((currentIndex) => (currentIndex - 1 + perspectives.length) % perspectives.length);
  const next = () => setIndex((currentIndex) => (currentIndex + 1) % perspectives.length);

  return (
    <section className="border-b border-line" aria-label={t('Psychology perspectives', 'মনোবিজ্ঞানের দৃষ্টিভঙ্গি')}>
      <div className="container-content py-12 md:py-16">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow text-bronze-500">{t('Ideas from psychology', 'মনোবিজ্ঞানের কিছু ধারণা')}</span>
            <h2 className="mt-2 font-display text-3xl leading-tight tracking-tightish text-ink">
              {t('Different ways to understand people', 'মানুষকে বোঝার নানা দৃষ্টিভঙ্গি')}
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
            {t('Nine perspectives. Original summaries, with links to their sources.', 'নয়টি দৃষ্টিভঙ্গি। মূল রচনার সূত্রসহ নিজস্ব সারাংশ।')}
          </p>
        </div>

        <div
          className="relative overflow-hidden rounded-sm border border-line bg-surface p-6 shadow-soft sm:p-8 md:p-10"
          role="group"
          aria-roledescription={t('carousel', 'স্লাইডার')}
          aria-label={t('Psychology perspectives', 'মনোবিজ্ঞানের দৃষ্টিভঙ্গি')}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
          }}
        >
          <div className="absolute left-0 top-0 h-1 w-16 bg-bronze-400" />
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider2 text-bronze-500">
              <Quote className="h-4 w-4" />
              {t('Key idea', 'মূল ধারণা')}
            </span>
            <span className="text-xs tabular-nums text-ink-muted" aria-live="polite">
              {String(index + 1).padStart(2, '0')} / {String(perspectives.length).padStart(2, '0')}
            </span>
          </div>

          <div className="mt-6 min-h-36" aria-live={paused || hovered || focused ? 'polite' : 'off'} aria-atomic="true">
            <p className="eyebrow text-ink-muted">{current.name}</p>
            <h3 className="mt-2 font-display text-2xl leading-tight text-ink sm:text-3xl">
              {language === 'en' ? current.titleEn : current.titleBn}
            </h3>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink/85 sm:text-lg">
              {language === 'en' ? current.ideaEn : current.ideaBn}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
              <span>{t('Further reading:', 'আরও পড়ুন:')}</span>
              <a href={current.source} target="_blank" rel="noreferrer" className="font-medium text-forest-600 underline decoration-line underline-offset-4 hover:text-forest-700">
                {current.work}
              </a>
              <span aria-hidden="true">·</span>
              <span>{t('summary, not a direct quotation', 'সারাংশ, সরাসরি উদ্ধৃতি নয়')}</span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button type="button" onClick={previous} className="btn-ghost h-9 w-9 border border-line p-0" aria-label={t('Previous perspective', 'আগের দৃষ্টিভঙ্গি')}>
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setPaused((value) => !value)} className="btn-ghost h-9 w-9 border border-line p-0" aria-label={paused ? t('Start automatic slides', 'স্বয়ংক্রিয় স্লাইড চালু করুন') : t('Pause automatic slides', 'স্বয়ংক্রিয় স্লাইড থামান')}>
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
              <button type="button" onClick={next} className="btn-ghost h-9 w-9 border border-line p-0" aria-label={t('Next perspective', 'পরের দৃষ্টিভঙ্গি')}>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
