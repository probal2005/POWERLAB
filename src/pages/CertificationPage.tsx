import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpen, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useContent } from '@/context/ContentContext';
import { supabase } from '@/lib/supabase';
import type { CertificationAssessmentResult, CertificationFinalQuestion, CertificationIssuedCertificate, CertificationStudentStatus, CertificationSubmittedAnswer } from '@/types/certification';

function optionList(value: unknown): string[] { return Array.isArray(value) ? value.map(String) : []; }

export default function CertificationPage() {
  const { user } = useAuth();
  const { laws } = useContent();
  const [status, setStatus] = useState<CertificationStudentStatus | null>(null);
  const [questions, setQuestions] = useState<CertificationFinalQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [attempt, setAttempt] = useState<CertificationAssessmentResult | null>(null);
  const [certificate, setCertificate] = useState<CertificationIssuedCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError('');
    const [statusResult, certificateResult] = await Promise.all([
      supabase.rpc('get_certification_student_status'),
      supabase.from('certificates').select('certificate_id,qualification,issued_at,status').eq('user_id', user.id).maybeSingle(),
    ]);
    if (statusResult.error) setError(statusResult.error.message);
    else setStatus(statusResult.data as CertificationStudentStatus);
    if (certificateResult.error) setError((current) => current || certificateResult.error.message);
    else setCertificate(certificateResult.data as CertificationIssuedCertificate | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { void reload(); }, [reload]);

  const allReady = Boolean(status && status.modules.length === 48 && status.modules.every((module) => module.is_ready));
  const completedSet = useMemo(() => new Set(status?.completed_law_slugs ?? []), [status]);
  const eligibleForFinal = Boolean(status?.programme_enabled && status.final_assessment_published && allReady && completedSet.size === 48);

  useEffect(() => {
    if (!eligibleForFinal || questions.length || !user) return;
    let active = true;
    void supabase.rpc('get_certification_final_questions').then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError) setError(loadError.message);
      else setQuestions((data ?? []) as CertificationFinalQuestion[]);
    });
    return () => { active = false; };
  }, [eligibleForFinal, questions.length, user]);

  async function markComplete(slug: string) {
    const { data: progress, error: progressError } = await supabase.from('student_law_progress').select('status').eq('user_id', user?.id).eq('law_slug', slug).maybeSingle();
    if (progressError) { setError(progressError.message); return; }
    if (progress?.status !== 'completed') { setError('Finish and mark the lesson complete before confirming this certification module.'); return; }
    setSaving(true); setError(''); setNotice('');
    const { error: completeError } = await supabase.rpc('complete_certification_module', { p_law_slug: slug });
    if (completeError) setError(completeError.message); else { setNotice('Module completion saved.'); await reload(); }
    setSaving(false);
  }

  async function submitAssessment() {
    if (!questions.length || Object.keys(answers).length !== questions.length) { setError('Answer every question before submitting.'); return; }
    const payload: CertificationSubmittedAnswer[] = questions.map((question) => ({ question_id: question.id, selected_option: answers[question.id] }));
    setSaving(true); setError(''); setNotice('');
    const { data, error: submitError } = await supabase.rpc('submit_certification_final_assessment', { p_answers: payload });
    if (submitError) setError(submitError.message); else { setAttempt(data as CertificationAssessmentResult); setNotice('Your assessment result has been saved.'); await reload(); }
    setSaving(false);
  }

  async function issueCertificate() {
    setSaving(true); setError(''); setNotice('');
    const { data, error: issueError } = await supabase.rpc('issue_powerlab_certificate');
    if (issueError) setError(issueError.message); else { setCertificate(data as CertificationIssuedCertificate); setNotice('Your certificate has been issued.'); }
    setSaving(false);
  }

  if (loading) return <div className="container-content py-20 text-sm text-ink-muted" role="status">Loading certification status…</div>;

  return <main className="container-content min-h-[70vh] py-12 md:py-16"><header className="border-b border-line pb-8"><p className="eyebrow text-bronze-600">POWERLAB Certification</p><h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">Master the 48 Laws</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">Complete approved lessons, pass the final assessment, and earn a verifiable certificate.</p></header>
    {(error || notice) && <p role={error ? 'alert' : 'status'} className={`mt-6 border p-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-forest-200 bg-forest-50 text-forest-800'}`}>{error || notice}</p>}
    {!status ? <p className="mt-8 text-sm text-ink-muted">Certification status is unavailable right now. Refresh to try again.</p> : <>
      <section className="mt-8 grid gap-4 sm:grid-cols-3"><Metric label="Approved modules" value={`${status.modules.filter((module) => module.is_ready).length}/48`} /><Metric label="Modules completed" value={`${completedSet.size}/48`} /><Metric label="Passing score" value={`${status.pass_percentage}%`} /></section>
      {certificate ? <section className="mt-8 border border-forest-200 bg-forest-50 p-6"><Award size={26} className="text-forest-700" /><h2 className="mt-3 font-display text-2xl text-ink">Certificate issued</h2><p className="mt-2 text-sm text-ink-muted">{certificate.qualification} · {certificate.certificate_id}</p><p className="mt-2 text-sm text-ink-muted">Status: {certificate.status}</p><Link className="btn-primary mt-5" to={`/verify-certificate?id=${encodeURIComponent(certificate.certificate_id)}`}>Verify certificate</Link></section> : null}
      {status.latest_attempt && <section className="mt-8 border border-line bg-surface p-6"><h2 className="font-display text-xl text-ink">Latest final assessment</h2><p className="mt-3 text-sm text-ink-muted">{status.latest_attempt.score}/{status.latest_attempt.total_questions} · {status.latest_attempt.percentage}% · {status.latest_attempt.passed ? 'Passed' : 'Not passed'}</p></section>}
      {!status.programme_enabled && <section className="mt-8 flex gap-3 border border-bronze-200 bg-bronze-50 p-5"><LockKeyhole className="mt-0.5 shrink-0 text-bronze-700" /><div><h2 className="font-semibold text-ink">Certification is not open yet</h2><p className="mt-1 text-sm leading-relaxed text-ink-muted">The administrator must review all course modules and publish the final question bank first. Your existing lessons remain available.</p></div></section>}
      <section className="mt-8"><div className="flex items-end justify-between gap-4"><div><h2 className="font-display text-xl text-ink">Course modules</h2><p className="mt-1 text-sm text-ink-muted">Module completion is recorded only after the lesson itself is marked complete.</p></div><Link to="/laws" className="btn-secondary"><BookOpen size={15} /> Explore lessons</Link></div><div className="mt-4 divide-y divide-line border border-line bg-surface">{status.modules.map((module) => { const law = laws.find((item) => item.slug === module.law_slug); const completed = completedSet.has(module.law_slug); return <div key={module.law_slug} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-ink">Law {String(module.law_number).padStart(2, '0')}: {law?.titleEn ?? module.law_slug}</p><p className="mt-1 text-xs text-ink-muted">{!module.is_ready ? 'Not yet approved for certification' : completed ? 'Completed' : 'Approved module'}</p></div>{law && <div className="flex gap-2">{module.is_ready && !completed && <button type="button" className="btn-secondary" disabled={saving} onClick={() => void markComplete(module.law_slug)}>Confirm complete</button>}<Link className="btn-ghost" to={`/laws/${law.slug}`}>Open lesson</Link></div>}</div>; })}</div></section>
      {eligibleForFinal && !certificate && <section className="mt-10 border-t border-line pt-8"><h2 className="font-display text-2xl text-ink">Final assessment</h2>{attempt && <p className="mt-2 text-sm text-ink-muted">You scored {attempt.percentage}%. {attempt.passed ? 'You passed.' : 'Review the lessons and try again.'}</p>}{questions.length === 0 ? <p className="mt-4 text-sm text-ink-muted">No published questions are available.</p> : <div className="mt-5 space-y-5">{questions.map((question, index) => { const choices = optionList(question.options_en); return <fieldset key={question.id} className="border border-line bg-surface p-5"><legend className="px-1 text-sm font-semibold text-ink">{index + 1}. {question.question_en}</legend><p className="mt-2 font-bengali text-sm text-ink-muted">{question.question_bn}</p><div className="mt-4 space-y-2">{choices.map((choice, choiceIndex) => { const bnChoice = optionList(question.options_bn)[choiceIndex]; return <label key={choiceIndex} className="flex cursor-pointer items-start gap-3 border border-line p-3 text-sm text-ink hover:border-forest-300"><input className="mt-1" type="radio" name={question.id} checked={answers[question.id] === choiceIndex} onChange={() => setAnswers((current) => ({ ...current, [question.id]: choiceIndex }))} /><span>{choice}<span className="mt-1 block font-bengali text-xs text-ink-muted">{bnChoice}</span></span></label>; })}</div></fieldset>; })}<button type="button" className="btn-primary" disabled={saving} onClick={() => void submitAssessment()}>{saving ? 'Submitting…' : 'Submit assessment'}</button>{status.latest_attempt?.passed && status.latest_attempt.assessment_version === status.assessment_version && <button type="button" className="btn-secondary ml-3" disabled={saving} onClick={() => void issueCertificate()}>Issue certificate</button>}</div>}</section>}
    </>}
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="border border-line bg-surface p-5"><p className="font-display text-3xl text-ink">{value}</p><p className="mt-1 text-xs text-ink-muted">{label}</p></div>; }
