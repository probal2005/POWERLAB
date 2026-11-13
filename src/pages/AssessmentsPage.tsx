import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, ClipboardCheck, LockKeyhole } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { useLanguage } from '@/context/LanguageContext';

export default function AssessmentsPage() {
  const { laws, loading, error } = useContent();
  const { language, t, tx } = useLanguage();
  const assessments = laws
    .filter((law) => law.isPublished !== false && law.assessment?.isPublished && (law.assessment.questions?.length ?? 0) > 0)
    .sort((a, b) => a.number - b.number);

  return (
    <main className="container-content min-h-[70vh] py-12 md:py-16">
      <header className="border-b border-line pb-8">
        <p className="eyebrow text-bronze-600">POWERLAB</p>
        <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">{t('Assessments', 'মূল্যায়ন')}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
          {t('Review the published lesson question banks and your certification path.', 'প্রকাশিত পাঠের প্রশ্ন এবং সার্টিফিকেশনের পথ দেখুন।')}
        </p>
      </header>

      <section className="mt-8 border border-line bg-surface p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <LockKeyhole size={19} className="mt-1 shrink-0 text-forest-700" />
            <div>
              <h2 className="font-display text-xl text-ink">{t('Certification final assessment', 'সার্টিফিকেশন চূড়ান্ত মূল্যায়ন')}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                {t('The final assessment opens inside the certification workspace after the programme and all required content are approved.', 'প্রোগ্রাম ও প্রয়োজনীয় পাঠ অনুমোদিত হলে সার্টিফিকেশন কর্মক্ষেত্রে চূড়ান্ত মূল্যায়ন চালু হবে।')}
              </p>
            </div>
          </div>
          <Link to="/certification" className="btn-secondary w-fit shrink-0">{t('View certification', 'সার্টিফিকেশন দেখুন')}<ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-ink">{t('Lesson assessments', 'পাঠের মূল্যায়ন')}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t(`${assessments.length} published`, `${assessments.length}টি প্রকাশিত`)}</p>
          </div>
          <Link to="/laws" className="btn-ghost"><BookOpen size={15} />{t('Browse laws', 'নিয়ম দেখুন')}</Link>
        </div>

        {error && <p role="alert" className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {loading ? <p className="mt-5 text-sm text-ink-muted" role="status">{t('Loading assessments…', 'মূল্যায়ন লোড হচ্ছে…')}</p> : assessments.length === 0 ? (
          <div className="mt-5 border border-line bg-surface p-8 text-center sm:p-10">
            <ClipboardCheck size={25} className="mx-auto text-forest-700" />
            <h3 className="mt-4 font-display text-xl text-ink">{t('No lesson assessments are published yet', 'এখনও কোনো পাঠের মূল্যায়ন প্রকাশিত হয়নি')}</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
              {t('Your administrator can publish a lesson assessment after its question bank has been reviewed. You can still read lessons and check certification readiness.', 'প্রশ্ন যাচাই করার পর প্রশাসক পাঠের মূল্যায়ন প্রকাশ করতে পারবেন। এর মধ্যে আপনি পাঠ পড়তে ও সার্টিফিকেশনের প্রস্তুতি দেখতে পারেন।')}
            </p>
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-line border border-line bg-surface">
            {assessments.map((law) => <li key={law.slug} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t(`Law ${String(law.number).padStart(2, '0')}`, `নিয়ম ${String(law.number).padStart(2, '0')}`)}</p>
                <h3 className={`mt-1 text-base font-semibold text-ink ${language === 'bn' ? 'font-bengali' : ''}`}>{tx(`law:${law.slug}:title`, law.titleEn, law.titleBn)}</h3>
                <p className="mt-1 text-xs text-ink-muted">{law.assessment?.questions.length ?? 0} {t('questions', 'টি প্রশ্ন')}</p>
              </div>
              <Link to={`/assessment/${law.slug}`} className="btn-secondary w-fit">{t('Start assessment', 'মূল্যায়ন শুরু করুন')}<ArrowRight size={15} /></Link>
            </li>)}
          </ul>
        )}
      </section>
    </main>
  );
}
