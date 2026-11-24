import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContent } from '@/context/ContentContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';

type MissedQuestion = {
  law_slug: string;
  question: {
    questionId: string; questionEn: string; questionBn: string;
    optionsEn: string[]; optionsBn: string[]; selectedOption: number; correctOption: number;
    explanationEn: string; explanationBn: string;
  };
};

export default function LearningReviewPage() {
  const { laws } = useContent();
  const { t } = useLanguage();
  const [questions, setQuestions] = useState<MissedQuestion[] | null>(null);
  const [notes, setNotes] = useState<{ law_slug: string; note: string }[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      supabase.rpc('get_powerlab_missed_questions').abortSignal(controller.signal),
      supabase.from('student_lesson_notes').select('law_slug,note').order('updated_at', { ascending: false }).abortSignal(controller.signal),
    ]).then(([review, saved]) => {
      if (controller.signal.aborted) return;
      setError(Boolean(review.error || saved.error));
      setQuestions(review.data ?? []);
      setNotes(saved.data ?? []);
    });
    return () => controller.abort();
  }, []);

  return <div className="space-y-7">
    <Link to="/student" className="btn-secondary">{t('Back to dashboard', 'ড্যাশবোর্ডে ফিরে যান')}</Link>
    <h1 className="font-display text-3xl text-ink">{t('Learning review', 'পাঠ পর্যালোচনা')}</h1>
    {error && <p role="alert" className="text-sm text-red-800">{t('Some learning data could not be loaded.', 'কিছু তথ্য লোড করা যায়নি।')}</p>}
    <section className="space-y-3">
      <h2 className="font-display text-xl">{t('Missed questions', 'ভুল হওয়া প্রশ্ন')}</h2>
      {questions === null ? <p role="status">Loading…</p> : questions.length === 0 && !error ? <p className="text-sm text-ink-muted">Missed questions from new attempts will appear here.</p> : null}
      {questions?.map(({ law_slug, question }) => <details key={`${law_slug}:${question.questionId}`} className="space-y-3 border border-line bg-surface p-4">
        <summary className="cursor-pointer font-medium">{t(question.questionEn, question.questionBn)}</summary>
        <p className="text-sm">{t('Your answer', 'আপনার উত্তর')} · {t(question.optionsEn[question.selectedOption], question.optionsBn[question.selectedOption])}</p>
        <p className="text-sm">{t('Correct answer', 'সঠিক উত্তর')} · {t(question.optionsEn[question.correctOption], question.optionsBn[question.correctOption])}</p>
        <p className="text-sm text-ink-muted">{t(question.explanationEn, question.explanationBn)}</p>
        {laws.some((law) => law.slug === law_slug && law.isPublished !== false) && <Link className="btn-secondary" to={`/laws/${law_slug}`}>{t('Review lesson', 'পাঠ পর্যালোচনা করুন')}</Link>}
      </details>)}
    </section>
    <section className="space-y-3">
      <h2 className="font-display text-xl">{t('Private notes', 'ব্যক্তিগত নোট')}</h2>
      {!notes.length && !error && <p className="text-sm text-ink-muted">Save a note from any lesson to see it here.</p>}
      {notes.map(({ law_slug, note }) => {
        const law = laws.find((law) => law.slug === law_slug && law.isPublished !== false);
        return <article className="space-y-2 border border-line bg-surface p-4" key={law_slug}>
          <h3 className="font-semibold">{law ? <Link className="underline" to={`/laws/${law_slug}`}>{t(law.titleEn, law.titleBn)}</Link> : law_slug}</h3>
          <p className="whitespace-pre-wrap break-words text-sm">{note}</p>
        </article>;
      })}
    </section>
  </div>;
}
