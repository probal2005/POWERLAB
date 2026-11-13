import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useContent } from '@/context/ContentContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { AssessmentQuestion } from '@/types/law';

interface AssessmentPageProps {
  final?: boolean;
}

interface AssessmentAttempt {
  id: string;
  lawSlug: string;
  timestamp: string;
  score: number;
  percentage: number;
  passed: boolean;
  answers: number[];
  reviewCorrect?: boolean[];
  review?: { correct: boolean; correctOption: number; explanationEn: string; explanationBn: string }[];
}

export default function AssessmentPage({ final = false }: AssessmentPageProps) {
  const { lawSlug } = useParams<{ lawSlug: string }>();
  const { t, tx, language } = useLanguage();
  const { laws } = useContent();
  const { user } = useAuth();

  const law = final
    ? undefined
    : laws.find(
        (item) =>
          item.slug === lawSlug && item.isPublished !== false
      );
  const assessmentTranslationPrefix = final ? 'final' : `law:${lawSlug}`;

  const assessment = law?.assessment;
  const questions: AssessmentQuestion[] = assessment?.questions ?? [];
  const isAssessmentPublished =
    !final &&
    law?.isPublished !== false &&
    assessment?.isPublished === true &&
    questions.length > 0;

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() =>
    Array(questions.length).fill(-1)
  );
  const [result, setResult] = useState<AssessmentAttempt | null>(null);
  const [history, setHistory] = useState<AssessmentAttempt[]>([]);

  useEffect(() => {
    setCurrentQuestion(0);
    setAnswers(Array(questions.length).fill(-1));
    setResult(null);
    setHistory([]);
  }, [lawSlug, final, questions.length]);

  useEffect(() => {
    if (!user || !lawSlug || final) return;
    void supabase.from('student_assessment_attempts')
      .select('id, law_slug, created_at, score, percentage, passed, answers')
      .eq('user_id', user.id).eq('law_slug', lawSlug)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data, error }) => {
        if (error || !data) return;
        setHistory(data.map((item) => ({
          id: item.id, lawSlug: item.law_slug, timestamp: item.created_at,
          score: item.score, percentage: item.percentage, passed: item.passed,
          answers: item.answers as number[],
        })));
      });
  }, [user, lawSlug, final]);

  const question = questions[currentQuestion];
  const selectedCount = answers.filter((answer) => answer !== -1).length;
  const allAnswered =
    questions.length > 0 && selectedCount === questions.length;

  const handleAnswer = (optionIndex: number) => {
    if (result) return;

    setAnswers((previous) =>
      previous.map((answer, index) =>
        index === currentQuestion ? optionIndex : answer
      )
    );
  };

  const handleSubmit = async () => {
    if (!isAssessmentPublished || !allAnswered || result || !law) return;
    if (!user) {
      window.alert(t('Sign in to submit and save your assessment.', 'মূল্যায়ন জমা ও সংরক্ষণ করতে সাইন ইন করুন।'));
      return;
    }

    const { data, error } = await supabase.rpc('submit_law_assessment', {
      p_law_slug: law.slug,
      p_answers: answers,
    });
    if (error) {
      window.alert(`Could not submit assessment: ${error.message}`);
      return;
    }
    const saved = data as Omit<AssessmentAttempt, 'lawSlug'>;
    if (!saved.review && saved.reviewCorrect) {
      saved.review = saved.reviewCorrect.map((correct) => ({ correct, correctOption: -1, explanationEn: '', explanationBn: '' }));
    }
    saved.reviewCorrect = saved.review?.map((item) => item.correct) ?? saved.reviewCorrect;
    const attempt: AssessmentAttempt = { ...saved, lawSlug: law.slug };
    setResult(attempt);
    setHistory((previous) => [attempt, ...previous].slice(0, 20));
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setAnswers(Array(questions.length).fill(-1));
    setResult(null);
  };

  if (!final && !law) {
    return (
      <section className="container-content flex min-h-[60vh] items-center justify-center py-20">
        <div className="max-w-lg text-center">
          <span className="font-display text-6xl text-forest-600">404</span>
          <h1 className="mt-4 font-display text-2xl text-ink">
            {t('Assessment not found', 'মূল্যায়ন পাওয়া যায়নি')}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            {t(
              'We could not find a published law associated with this assessment address.',
              'এই মূল্যায়নের ঠিকানার সঙ্গে সম্পর্কিত কোনো প্রকাশিত নিয়ম খুঁজে পাওয়া যায়নি।'
            )}
          </p>
          <Link to="/assessments" className="btn-primary mt-7">
            <ArrowLeft className="h-4 w-4" />
            {t('View assessments', 'মূল্যায়ন দেখুন')}
          </Link>
        </div>
      </section>
    );
  }

  const title = final
    ? t('The 48 Laws — Final Assessment', '৪৮টি নিয়ম — চূড়ান্ত মূল্যায়ন')
    : tx(`law:${law!.slug}:title`, law!.titleEn, law!.titleBn);

  const description = final
    ? t(
        'A comprehensive assessment covering the principles and ideas across all 48 laws.',
        '৪৮টি নিয়মের নীতি ও ধারণাগুলোর ওপর একটি সমন্বিত মূল্যায়ন।'
      )
    : tx(`law:${law!.slug}:short`, law!.shortEn, law!.shortBn);

  const passPercentage = assessment?.passPercentage ?? 60;
  const bestPercentage =
    history.length > 0
      ? Math.max(...history.map((attempt) => attempt.percentage))
      : null;

  return (
    <section className={language === 'bn' ? 'font-bengali' : ''}>
      <div className="border-b border-line bg-canvas-2/60">
        <div className="container-content py-10 md:py-14">
          <Link
            to={final ? '/laws' : `/laws/${law!.slug}`}
            className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-forest-600"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('Back to reading', 'পড়ার পাতায় ফিরে যান')}
          </Link>

          <div className="mt-8 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-forest-500/10 text-forest-600">
              <ClipboardList className="h-5 w-5" />
            </span>
            <span className="eyebrow text-bronze-500">
              {final
                ? t('COMPREHENSIVE ASSESSMENT', 'সমন্বিত মূল্যায়ন')
                : t('LESSON ASSESSMENT', 'পাঠের মূল্যায়ন')}
            </span>
          </div>

          <h1 className="mt-5 max-w-3xl font-display text-3xl leading-tight tracking-tightish text-ink md:text-5xl">
            {title}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-[1.85] text-ink-muted">
            {description}
          </p>

          {!final && law && (
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-bronze-500">
              {t(
                `LAW ${String(law.number).padStart(2, '0')}`,
                `নিয়ম ${String(law.number).padStart(2, '0')}`
              )}
            </p>
          )}
        </div>
      </div>

      <div className="container-content py-14 md:py-20">
        <div className="mx-auto max-w-3xl">
          {!isAssessmentPublished ? (
            <div className="surface-card p-7 text-center sm:p-10">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-500/10 text-forest-600">
                <FileText className="h-6 w-6" />
              </span>

              <span className="eyebrow mt-7 block text-bronze-500">
                {t('ASSESSMENT CONTENT', 'মূল্যায়নের বিষয়বস্তু')}
              </span>

              <h2 className="mt-4 font-display text-2xl text-ink md:text-3xl">
                {final
                  ? t(
                      'Final assessment coming soon',
                      'চূড়ান্ত মূল্যায়ন শীঘ্রই আসছে'
                    )
                  : t(
                      'Assessment not available yet',
                      'মূল্যায়ন এখনো উপলব্ধ নয়'
                    )}
              </h2>

              <p className="mx-auto mt-5 max-w-lg text-sm leading-[1.9] text-ink-muted">
                {final
                  ? t(
                      'The final assessment question bank has not been published yet. It will become available after its questions, answers, and explanations have been created.',
                      'চূড়ান্ত মূল্যায়নের প্রশ্নভান্ডার এখনো প্রকাশ করা হয়নি। প্রশ্ন, উত্তর এবং ব্যাখ্যা তৈরি ও প্রকাশিত হলে এটি উপলব্ধ হবে।'
                    )
                  : t(
                      'This assessment has not been published by the administrator yet. Please return after its questions and explanations become available.',
                      'প্রশাসক এখনো এই মূল্যায়ন প্রকাশ করেননি। প্রশ্ন ও ব্যাখ্যা উপলব্ধ হলে আবার ফিরে আসুন।'
                    )}
              </p>

              <div className="my-8 rule-line" />

              {!final && (
                <div className="grid gap-4 text-left sm:grid-cols-2">
                  <div className="rounded-sm bg-canvas p-4">
                    <span className="text-xs text-ink-muted">
                      {t('Assessment format', 'মূল্যায়নের ধরন')}
                    </span>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {t(
                        'Multiple-choice questions',
                        'বহুনির্বাচনী প্রশ্ন'
                      )}
                    </p>
                  </div>

                  <div className="rounded-sm bg-canvas p-4">
                    <span className="text-xs text-ink-muted">
                      {t('Passing score', 'পাস নম্বর')}
                    </span>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {passPercentage}%
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/assessments" className="btn-primary">
                  <BookOpen className="h-4 w-4" />
                  {t('View assessments', 'মূল্যায়ন দেখুন')}
                </Link>

                {!final && law && (
                  <Link to={`/laws/${law.slug}`} className="btn-secondary">
                    {t('Return to this lesson', 'এই পাঠে ফিরে যান')}
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              {!result ? (
                <div className="surface-card p-6 sm:p-9">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="eyebrow text-bronze-500">
                        {t('YOUR ASSESSMENT', 'আপনার মূল্যায়ন')}
                      </span>
                      <h2 className="mt-2 font-display text-xl text-ink">
                        {t('Test your understanding', 'আপনার বোঝাপড়া যাচাই করুন')}
                      </h2>
                    </div>

                    <span className="rounded-sm bg-canvas px-3 py-2 text-sm font-semibold text-ink">
                      {t('Pass mark', 'পাস নম্বর')}: {passPercentage}%
                    </span>
                  </div>

                  <div className="mt-7">
                    <div className="mb-2 flex items-center justify-between text-xs text-ink-muted">
                      <span>
                        {t('Question progress', 'প্রশ্নের অগ্রগতি')}
                      </span>
                      <span>
                        {selectedCount}/{questions.length}{' '}
                        {t('answered', 'উত্তর দেওয়া হয়েছে')}
                      </span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-canvas"
                      role="progressbar"
                      aria-valuenow={selectedCount}
                      aria-valuemin={0}
                      aria-valuemax={questions.length}
                      aria-label={t('Answered questions', 'উত্তর দেওয়া প্রশ্ন')}
                    >
                      <div
                        className="h-full rounded-full bg-forest-500 transition-all"
                        style={{
                          width: `${(selectedCount / questions.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-bronze-500">
                      {t('QUESTION', 'প্রশ্ন')} {currentQuestion + 1}{' '}
                      {t('OF', 'এর মধ্যে')} {questions.length}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {t('Choose one answer', 'একটি উত্তর নির্বাচন করুন')}
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-xl leading-relaxed text-ink sm:text-2xl">
                    {tx(`${assessmentTranslationPrefix}:assessment:${question.id}:question`, question.questionEn, question.questionBn)}
                  </h3>

                  <div className="mt-7 grid gap-3">
                    {(language === 'bn' ? question.optionsBn : question.optionsEn).map((option, optionIndex) => {
                      const displayedOption = language === 'en' || language === 'bn'
                        ? option
                        : tx(`${assessmentTranslationPrefix}:assessment:${question.id}:option:${optionIndex}`, question.optionsEn[optionIndex], question.optionsBn[optionIndex]);
                      const isSelected =
                        answers[currentQuestion] === optionIndex;

                      return (
                        <button
                          key={`${question.id}-${optionIndex}`}
                          type="button"
                          onClick={() => handleAnswer(optionIndex)}
                          aria-pressed={isSelected}
                          className={`flex w-full items-start gap-4 border p-4 text-left transition-colors ${
                            isSelected
                              ? 'border-forest-500 bg-forest-500/10 text-forest-800'
                              : 'border-line bg-surface text-ink hover:border-forest-300 hover:bg-canvas'
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                              isSelected
                                ? 'border-forest-500 bg-forest-500 text-white'
                                : 'border-line bg-canvas text-ink-muted'
                            }`}
                          >
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          <span className="pt-1 text-sm leading-relaxed">
                          {displayedOption}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentQuestion((previous) =>
                          Math.max(0, previous - 1)
                        )
                      }
                      disabled={currentQuestion === 0}
                      className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {t('Previous', 'আগের প্রশ্ন')}
                    </button>

                    {currentQuestion < questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentQuestion((previous) =>
                            Math.min(questions.length - 1, previous + 1)
                          )
                        }
                        className="btn-primary"
                      >
                        {t('Next question', 'পরবর্তী প্রশ্ন')}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!allAnswered}
                        className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {t('Submit assessment', 'মূল্যায়ন জমা দিন')}
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {!allAnswered && currentQuestion === questions.length - 1 && (
                    <p className="mt-4 text-right text-xs text-ink-muted">
                      {t(
                        `Answer all ${questions.length} questions before submitting.`,
                        `জমা দেওয়ার আগে সব ${questions.length}টি প্রশ্নের উত্তর দিন।`
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-7">
                  <div className="surface-card p-7 text-center sm:p-10">
                    <span
                      className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                        result.passed
                          ? 'bg-forest-500/10 text-forest-600'
                          : 'bg-red-500/10 text-red-600'
                      }`}
                    >
                      {result.passed ? (
                        <CheckCircle2 className="h-8 w-8" />
                      ) : (
                        <XCircle className="h-8 w-8" />
                      )}
                    </span>

                    <span className="eyebrow mt-6 block text-bronze-500">
                      {t('ASSESSMENT RESULT', 'মূল্যায়নের ফলাফল')}
                    </span>

                    <h2 className="mt-3 font-display text-3xl text-ink">
                      {result.passed
                        ? t('Congratulations! You passed.', 'অভিনন্দন! আপনি পাস করেছেন।')
                        : t('Keep learning and try again.', 'শেখা চালিয়ে যান এবং আবার চেষ্টা করুন।')}
                    </h2>

                    <div className="mt-7">
                      <span className="font-display text-6xl text-ink">
                        {result.percentage}%
                      </span>
                      <p className="mt-2 text-sm text-ink-muted">
                        {t('Your score', 'আপনার প্রাপ্ত নম্বর')}
                      </p>
                    </div>

                    <div className="mx-auto mt-7 grid max-w-md grid-cols-2 gap-3 text-left">
                      <div className="rounded-sm bg-canvas p-4">
                        <span className="text-xs text-ink-muted">
                          {t('Correct answers', 'সঠিক উত্তর')}
                        </span>
                        <p className="mt-1 text-xl font-semibold text-forest-700">
                          {result.score}/{questions.length}
                        </p>
                      </div>
                      <div className="rounded-sm bg-canvas p-4">
                        <span className="text-xs text-ink-muted">
                          {t('Passing score', 'পাস নম্বর')}
                        </span>
                        <p className="mt-1 text-xl font-semibold text-ink">
                          {passPercentage}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="btn-primary"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {t('Try again', 'আবার চেষ্টা করুন')}
                      </button>
                      <Link
                        to={`/laws/${law!.slug}`}
                        className="btn-secondary"
                      >
                        <BookOpen className="h-4 w-4" />
                        {t('Back to lesson', 'পাঠে ফিরে যান')}
                      </Link>
                    </div>
                  </div>

                  <section className="surface-card p-6 sm:p-8">
                    <span className="eyebrow text-bronze-500">
                      {t('ANSWER REVIEW', 'উত্তর পর্যালোচনা')}
                    </span>
                    <h3 className="mt-2 font-display text-2xl text-ink">
                      {t('Review your answers', 'আপনার উত্তরগুলো পর্যালোচনা করুন')}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {t(
                        'Compare your choices with the correct answers and read each explanation.',
                        'সঠিক উত্তরের সঙ্গে আপনার নির্বাচন তুলনা করুন এবং প্রতিটি ব্যাখ্যা পড়ুন।'
                      )}
                    </p>

                    <div className="mt-7 space-y-7">
                      {questions.map((item, index) => {
                        const selectedAnswer = result.answers[index];
                        const review = result.review?.[index];
                        const isCorrect = review?.correct ?? result.reviewCorrect?.[index] ?? false;
                        const options = language === 'bn' ? item.optionsBn : item.optionsEn;

                        return (
                          <article
                            key={item.id}
                            className="border-t border-line pt-6 first:border-0 first:pt-0"
                          >
                            <div className="flex items-start gap-3">
                              {isCorrect ? (
                                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-forest-600" />
                              ) : (
                                <XCircle className="mt-1 h-5 w-5 shrink-0 text-red-600" />
                              )}
                              <div className="min-w-0">
                                <span className="text-xs font-semibold uppercase tracking-wider text-bronze-500">
                                  {t('QUESTION', 'প্রশ্ন')} {index + 1}
                                </span>
                                <h4 className="mt-2 font-semibold leading-relaxed text-ink">
                                  {tx(`${assessmentTranslationPrefix}:assessment:${item.id}:question`, item.questionEn, item.questionBn)}
                                </h4>
                              </div>
                            </div>

                            <div className="mt-4 space-y-2 pl-8">
                              {options.map((option, optionIndex) => {
                                const isChosen =
                                  optionIndex === selectedAnswer;

                                const isCorrectOption = optionIndex === review?.correctOption;
                                return (
                                  <div
                                    key={optionIndex}
                                    className={`border px-3 py-3 text-sm ${
                                      isCorrectOption
                                        ? 'border-forest-300 bg-forest-500/10 text-forest-800'
                                        : isChosen && !isCorrectOption
                                          ? 'border-red-300 bg-red-500/10 text-red-800'
                                          : 'border-line text-ink-muted'
                                    }`}
                                  >
                                    <span className="mr-2 font-semibold">
                                      {String.fromCharCode(65 + optionIndex)}.
                                    </span>
                                    {language === 'en' || language === 'bn' ? option : tx(`${assessmentTranslationPrefix}:assessment:${item.id}:option:${optionIndex}`, item.optionsEn[optionIndex], item.optionsBn[optionIndex])}
                                    {isChosen && (
                                      <span className="ml-2 text-xs font-semibold">
                                        {isCorrect
                                          ? t('Your answer · correct', 'আপনার উত্তর · সঠিক')
                                          : t('Your answer · incorrect', 'আপনার উত্তর · ভুল')}
                                      </span>
                                    )}
                                    {isCorrectOption && !isChosen && (
                                      <span className="ml-2 text-xs font-semibold">
                                        {t('Correct answer', 'সঠিক উত্তর')}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="ml-8 mt-4 rounded-sm bg-canvas p-4">
                              <p className="text-xs font-semibold uppercase tracking-wider text-bronze-500">
                                {t('EXPLANATION', 'ব্যাখ্যা')}
                              </p>
                              <p className="mt-2 text-sm leading-relaxed text-ink">
                                {tx(`${assessmentTranslationPrefix}:assessment:${item.id}:explanation`, review?.explanationEn ?? item.explanationEn, review?.explanationBn ?? item.explanationBn)}
                              </p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
                <span>
                  {t('Previous attempts', 'পূর্ববর্তী প্রচেষ্টা')}: {history.length}
                </span>
                {bestPercentage !== null && (
                  <span>
                    {t('Best score', 'সর্বোচ্চ নম্বর')}: {bestPercentage}%
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
