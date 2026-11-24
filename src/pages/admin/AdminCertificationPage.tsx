import CertificateManagement from '@/components/admin/CertificateManagement';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronDown, Plus, Save, Trash2 } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { supabase } from '@/lib/supabase';
import type { CertificationAdminModule, CertificationAdminQuestion, CertificationProgramSettings } from '@/types/certification';

const emptyQuestion = (): Omit<CertificationAdminQuestion, 'id' | 'created_at' | 'updated_at'> => ({
  question_en: '', question_bn: '', options_en: ['', '', '', ''], options_bn: ['', '', '', ''],
  correct_option: 0, explanation_en: '', explanation_bn: '', is_active: false, sort_order: 0,
});

function options(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : ['', '', '', ''];
}

export default function AdminCertificationPage() {
  const { laws } = useContent();
  const [modules, setModules] = useState<CertificationAdminModule[]>([]);
  const [settings, setSettings] = useState<CertificationProgramSettings | null>(null);
  const [questions, setQuestions] = useState<CertificationAdminQuestion[]>([]);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [questionFeedback, setQuestionFeedback] = useState<{ id: string; text: string; error: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [passDraft, setPassDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const [moduleResult, settingsResult, questionResult] = await Promise.all([
      supabase.from('certification_modules').select('*').order('law_number'),
      supabase.from('certification_program_settings').select('*').eq('id', true).maybeSingle(),
      supabase.from('certification_final_questions').select('*').order('sort_order').order('created_at'),
    ]);
    const firstError = moduleResult.error ?? settingsResult.error ?? questionResult.error;
    if (firstError) setError(firstError.message);
    setModules((moduleResult.data ?? []) as CertificationAdminModule[]);
    setSettings((settingsResult.data ?? null) as CertificationProgramSettings | null);
    setQuestions((questionResult.data ?? []) as CertificationAdminQuestion[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const readyCount = modules.filter((module) => module.is_ready).length;
  const activeCount = questions.filter((question) => question.is_active).length;

  async function setModuleReady(module: CertificationAdminModule, ready: boolean) {
    const law = laws.find((item) => item.slug === module.law_slug);
    if (ready && (!law || law.isPublished === false || !(law.sections?.length))) {
      setError(`Law ${module.law_number} needs published lesson sections before certification approval.`); return;
    }
    if (ready && !window.confirm(`Approve Law ${module.law_number} as a certification module?`)) return;
    setSaving(true); setError(''); setNotice('');
    const { error: saveError } = await supabase.from('certification_modules').update({ is_ready: ready, reviewed_by: (await supabase.auth.getUser()).data.user?.id ?? null, reviewed_at: ready ? new Date().toISOString() : null }).eq('law_slug', module.law_slug);
    if (saveError) setError(saveError.message); else { setNotice(`Law ${module.law_number} readiness updated.`); await load(); }
    setSaving(false);
  }

  async function saveSettings(patch: Partial<CertificationProgramSettings>) {
    if (!settings || saving) return;
    const next = { ...settings, ...patch };
    if (patch.programme_enabled || patch.final_assessment_published) {
      const [moduleResult, questionResult] = await Promise.all([
        supabase.from('certification_modules').select('is_ready'),
        supabase.from('certification_final_questions').select('id').eq('is_active', true),
      ]);
      if (moduleResult.error || questionResult.error) { setError(moduleResult.error?.message ?? questionResult.error?.message ?? 'Could not verify publication prerequisites.'); return; }
      const ready = moduleResult.data?.filter((module) => module.is_ready).length ?? 0;
      if (ready !== 48) { setError('All 48 lessons must be reviewed and approved before enabling certification or publishing its final assessment.'); return; }
      if (patch.final_assessment_published && !(questionResult.data?.length)) { setError('Add and review questions before publishing the final assessment.'); return; }
    }
    if (next.programme_enabled && !next.final_assessment_published) { setError('Publish the final assessment before enabling certification.'); return; }
    setSaving(true); setError(''); setNotice('');
    const { data: authData } = await supabase.auth.getUser();
    const { data: savedSettings, error: saveError } = await supabase.from('certification_program_settings').update({ ...patch, updated_by: authData.user?.id ?? null, updated_at: new Date().toISOString() }).eq('id', true).select('*').single<CertificationProgramSettings>();
    if (saveError) setError(saveError.message); else { setSettings(savedSettings); if (patch.pass_percentage !== undefined) setPassDraft(null); setNotice('Certification settings saved.'); }
    setSaving(false);
  }

  function addQuestion() {
    const id = crypto.randomUUID();
    setOpenQuestion(id);
    setQuestionFeedback(null);
    setQuestions((items) => [...items, {
      ...emptyQuestion(), id, created_at: '', updated_at: '',
      sort_order: Math.max(0, ...items.map((item) => item.sort_order)) + 1,
    }]);
    requestAnimationFrame(() => document.getElementById(`question-toggle-${id}`)?.focus());
  }

  async function saveQuestion(question: CertificationAdminQuestion) {
    const payload = { question_en: question.question_en.trim(), question_bn: question.question_bn.trim(), options_en: options(question.options_en).map((value) => value.trim()), options_bn: options(question.options_bn).map((value) => value.trim()), correct_option: question.correct_option, explanation_en: question.explanation_en.trim(), explanation_bn: question.explanation_bn.trim(), is_active: question.is_active, sort_order: question.sort_order };
    if (!payload.question_en || !payload.question_bn || [...payload.options_en, ...payload.options_bn].some((value) => !value)) { setQuestionFeedback({ id: question.id, text: 'Complete both question fields and all eight answer fields before saving.', error: true }); return; }
    setSaving(true); setQuestionFeedback(null);
    const table = supabase.from('certification_final_questions');
    const request = question.created_at
      ? table.update(payload).eq('id', question.id)
      : table.insert({ ...payload, id: question.id });
    const { data, error: saveError } = await request.select('*').single();
    if (saveError) setQuestionFeedback({ id: question.id, text: saveError.message, error: true }); else {
      setQuestionFeedback({ id: question.id, text: 'Question saved.', error: false });
      setQuestions((items) => items.map((item) => item.id === question.id ? data as CertificationAdminQuestion : item));
    }
    setSaving(false);
  }

  async function deleteQuestion(question: CertificationAdminQuestion) {
    if (!window.confirm('Delete this final assessment question? Existing attempts remain unchanged.')) return;
    if (!question.created_at) {
      setQuestions((items) => items.filter((item) => item.id !== question.id));
      return;
    }
    setSaving(true); setError(''); setNotice('');
    const { error: deleteError } = await supabase.from('certification_final_questions').delete().eq('id', question.id);
    if (deleteError) setQuestionFeedback({ id: question.id, text: deleteError.message, error: true });
    else {
      setQuestions((items) => items.filter((item) => item.id !== question.id));
      setQuestionFeedback({ id: question.id, text: 'Question deleted.', error: false });
    }
    setSaving(false);
  }

  function editQuestion(id: string, patch: Partial<CertificationAdminQuestion>) {
    setQuestions((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  if (loading) return <p className="py-10 text-sm text-ink-muted">Loading certification workspace…</p>;

  return <div className="animate-fade-up space-y-8">
    <header className="border-b border-line pb-8"><p className="eyebrow text-bronze-600">Administration</p><h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">Certification</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">Review course readiness, write the bilingual final question bank, and publish the programme only after its requirements are met.</p></header>
    {(error || notice) && <p role={error ? 'alert' : 'status'} className={`border p-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-forest-200 bg-forest-50 text-forest-800'}`}>{error || notice}</p>}
    <a href="#final-question-bank" className="btn-secondary">Jump to final question bank</a>
    <CertificateManagement />
    <section className="grid gap-4 sm:grid-cols-3"><Metric label="Approved modules" value={`${readyCount}/48`} /><Metric label="Active final questions" value={activeCount} /><Metric label="Programme" value={settings?.programme_enabled ? 'Enabled' : 'Disabled'} /></section>
    {settings && <section className="space-y-4 border border-line bg-surface p-5 sm:p-7"><div><h2 className="font-display text-xl text-ink">Programme settings</h2><p className="mt-1 text-sm text-ink-muted">Publishing and programme activation remain blocked until every module and question is ready.</p></div><label className="flex items-center gap-3 text-sm text-ink"><input type="checkbox" checked={settings.final_assessment_published} disabled={saving} onChange={(event) => void saveSettings({ final_assessment_published: event.target.checked })} /> Publish final assessment</label><label className="flex items-center gap-3 text-sm text-ink"><input type="checkbox" checked={settings.programme_enabled} disabled={saving} onChange={(event) => void saveSettings({ programme_enabled: event.target.checked })} /> Enable certification programme</label><form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
          event.preventDefault();
          const value = Number(passDraft);
          if (passDraft !== null && Number.isInteger(value) && value >= 1 && value <= 100) void saveSettings({ pass_percentage: value });
        }}>
          <label className="block max-w-xs text-xs font-semibold text-ink-muted">Passing score (%)
            <input className="field-input mt-1" type="number" min={1} max={100} step={1} required
              value={passDraft ?? settings.pass_percentage} disabled={saving} onChange={(event) => setPassDraft(event.target.value)} />
          </label>
          <button type="submit" className="btn-secondary" disabled={saving || passDraft === null}>Save passing score</button>
        </form></section>}
    <section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-xl text-ink">Module review</h2><p className="mt-1 text-sm text-ink-muted">A module can be approved only when its published lesson has real sections.</p></div><Link to="/admin/laws" className="btn-secondary">Review law content</Link></div><div className="divide-y divide-line border border-line bg-surface">{modules.map((module) => { const law = laws.find((item) => item.slug === module.law_slug); const hasContent = Boolean(law && law.isPublished !== false && law.sections?.length); return <div key={module.law_slug} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-ink">Law {String(module.law_number).padStart(2, '0')}: {law?.titleEn ?? module.law_slug}</p><p className="mt-1 text-xs text-ink-muted">{hasContent ? `${law?.sections?.length} lesson sections` : 'Published lesson content is incomplete'} · {module.is_ready ? `Approved ${module.reviewed_at ? new Date(module.reviewed_at).toLocaleDateString() : ''}` : 'Not approved'}</p></div><button type="button" className={module.is_ready ? 'btn-secondary' : 'btn-primary'} disabled={saving || (!module.is_ready && !hasContent)} onClick={() => void setModuleReady(module, !module.is_ready)}>{module.is_ready ? 'Remove approval' : 'Approve module'}</button></div>; })}</div></section>
    <section id="final-question-bank" aria-labelledby="final-question-bank-heading" className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 id="final-question-bank-heading" className="font-display text-xl text-ink">Final question bank</h2>
          <p className="mt-1 text-sm text-ink-muted">{questions.length} questions · {activeCount} active</p>
        </div>
        <button type="button" className="btn-primary" disabled={saving} onClick={addQuestion}><Plus size={16} /> Add question</button>
      </div>
      {questionFeedback && !questions.some((question) => question.id === questionFeedback.id) &&
        <p role="status" className="text-sm text-forest-700">{questionFeedback.text}</p>}
      {questions.length === 0 ? (
        <div className="flex items-start gap-3 border border-bronze-200 bg-bronze-50 p-4 text-sm text-ink-muted">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-bronze-700" />
          <p>Add a bilingual question to start the question bank.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <QuestionEditor
              key={question.id}
              question={question}
              index={index}
              expanded={openQuestion === question.id}
              saving={saving}
              feedback={questionFeedback?.id === question.id ? questionFeedback : null}
              onToggle={() => setOpenQuestion((current) => current === question.id ? null : question.id)}
              onChange={(patch) => editQuestion(question.id, patch)}
              onSave={() => void saveQuestion(question)}
              onDelete={() => void deleteQuestion(question)}
            />
          ))}
        </div>
      )}
    </section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="border border-line bg-surface p-5"><p className="font-display text-3xl text-ink">{value}</p><p className="mt-1 text-xs text-ink-muted">{label}</p></div>; }

function QuestionEditor({ question, index, expanded, saving, feedback, onToggle, onChange, onSave, onDelete }: {
  question: CertificationAdminQuestion;
  index: number;
  expanded: boolean;
  saving: boolean;
  feedback: { text: string; error: boolean } | null;
  onToggle: () => void;
  onChange: (patch: Partial<CertificationAdminQuestion>) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const toggleId = `question-toggle-${question.id}`;
  const panelId = `question-panel-${question.id}`;
  const optsEn = options(question.options_en);
  const optsBn = options(question.options_bn);

  function changeOption(language: 'en' | 'bn', index: number, value: string) {
    const next = [...(language === 'en' ? optsEn : optsBn)];
    next[index] = value;
    onChange(language === 'en' ? { options_en: next } : { options_bn: next });
  }

  return (
    <article className="border border-line bg-surface">
      <h3>
        <button id={toggleId} type="button" aria-expanded={expanded} aria-controls={panelId} onClick={onToggle}
          className="flex w-full items-start gap-3 p-4 text-left hover:bg-canvas-2 sm:p-5">
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-ink-muted">Question {index + 1} · {question.created_at ? (question.is_active ? 'Active' : 'Draft') : 'Unsaved'}</span>
            <span className="mt-1 line-clamp-2 block break-words text-sm font-medium text-ink">{question.question_en.trim() || 'Untitled question'}</span>
          </span>
          <ChevronDown aria-hidden="true" className={`mt-1 h-4 w-4 shrink-0 text-ink-muted ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      <div id={panelId} hidden={!expanded} aria-labelledby={toggleId}>
        {expanded && <form className="border-t border-line p-4 sm:p-5" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
          <fieldset disabled={saving} className="min-w-0 space-y-5">
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              <label className="min-w-0 text-sm font-medium">Question (English)
                <textarea rows={3} className="field-input mt-1 resize-y" value={question.question_en} onChange={(event) => onChange({ question_en: event.target.value })} />
              </label>
              <label className="min-w-0 text-sm font-medium" lang="bn">প্রশ্ন (বাংলা)
                <textarea rows={3} className="field-input mt-1 resize-y font-bengali" value={question.question_bn} onChange={(event) => onChange({ question_bn: event.target.value })} />
              </label>
            </div>
            <fieldset className="min-w-0 space-y-3">
              <legend className="mb-2 text-sm font-semibold">Answer choices</legend>
              {['A', 'B', 'C', 'D'].map((letter, optionIndex) => (
                <div key={letter} className={`space-y-3 border p-3 ${question.correct_option === optionIndex ? 'border-forest-200 bg-forest-50' : 'border-line'}`}>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="radio" name={`correct-${question.id}`} checked={question.correct_option === optionIndex}
                      onChange={() => onChange({ correct_option: optionIndex })} />
                    Correct answer {letter}
                  </label>
                  <div className="grid min-w-0 gap-3 xl:grid-cols-2">
                    <label className="min-w-0 text-xs font-medium">Option {letter} (English)
                      <textarea rows={2} className="field-input mt-1 resize-y" value={optsEn[optionIndex] ?? ''}
                        onChange={(event) => changeOption('en', optionIndex, event.target.value)} />
                    </label>
                    <label className="min-w-0 text-xs font-medium" lang="bn">বিকল্প {letter} (বাংলা)
                      <textarea rows={2} className="field-input mt-1 resize-y font-bengali" value={optsBn[optionIndex] ?? ''}
                        onChange={(event) => changeOption('bn', optionIndex, event.target.value)} />
                    </label>
                  </div>
                </div>
              ))}
            </fieldset>
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              <label className="min-w-0 text-sm font-medium">Explanation (English)
                <textarea rows={3} className="field-input mt-1 resize-y" value={question.explanation_en} onChange={(event) => onChange({ explanation_en: event.target.value })} />
              </label>
              <label className="min-w-0 text-sm font-medium" lang="bn">ব্যাখ্যা (বাংলা)
                <textarea rows={3} className="field-input mt-1 resize-y font-bengali" value={question.explanation_bn} onChange={(event) => onChange({ explanation_bn: event.target.value })} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={question.is_active} onChange={(event) => onChange({ is_active: event.target.checked })} />
              Include in the published assessment
            </label>
            <div className="flex flex-wrap gap-3 border-t border-line pt-4">
              <button type="submit" className="btn-primary"><Save size={15} /> Save question</button>
              <button type="button" className="btn-ghost text-red-700" onClick={onDelete}><Trash2 size={15} /> Delete question</button>
            </div>
            {feedback && <p role={feedback.error ? 'alert' : 'status'} className={`text-sm ${feedback.error ? 'text-red-800' : 'text-forest-700'}`}>{feedback.text}</p>}
          </fieldset>
        </form>}
      </div>
    </article>
  );
}
