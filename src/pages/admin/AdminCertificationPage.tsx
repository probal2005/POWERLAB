import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, Plus, Save, Trash2 } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
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
    if (!settings) return;
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
    if (patch.programme_enabled && !next.final_assessment_published) { setError('Publish the final assessment before enabling certification.'); return; }
    setSaving(true); setError(''); setNotice('');
    const { data: authData } = await supabase.auth.getUser();
    const { error: saveError } = await supabase.from('certification_program_settings').update({ programme_enabled: next.programme_enabled, final_assessment_published: next.final_assessment_published, pass_percentage: next.pass_percentage, updated_by: authData.user?.id ?? null }).eq('id', true);
    if (saveError) setError(saveError.message); else { setSettings(next); setNotice('Certification settings saved.'); }
    setSaving(false);
  }

  async function addQuestion() {
    setSaving(true); setError(''); setNotice('');
    const { data, error: saveError } = await supabase.from('certification_final_questions').insert({ ...emptyQuestion(), sort_order: questions.length + 1 }).select('*').single();
    if (saveError) setError(saveError.message); else { setQuestions((items) => [...items, data as CertificationAdminQuestion]); setNotice('Draft question added.'); }
    setSaving(false);
  }

  async function saveQuestion(question: CertificationAdminQuestion) {
    const payload = { question_en: question.question_en.trim(), question_bn: question.question_bn.trim(), options_en: options(question.options_en).map((value) => value.trim()), options_bn: options(question.options_bn).map((value) => value.trim()), correct_option: question.correct_option, explanation_en: question.explanation_en.trim(), explanation_bn: question.explanation_bn.trim(), is_active: question.is_active, sort_order: question.sort_order };
    if (!payload.question_en || !payload.question_bn || [...payload.options_en, ...payload.options_bn].some((value) => !value)) { setError('Complete the bilingual question and all eight answer labels before saving.'); return; }
    setSaving(true); setError(''); setNotice('');
    const { error: saveError } = await supabase.from('certification_final_questions').update(payload).eq('id', question.id);
    if (saveError) setError(saveError.message); else { setNotice('Question saved.'); await load(); }
    setSaving(false);
  }

  async function deleteQuestion(question: CertificationAdminQuestion) {
    if (!window.confirm('Delete this final assessment question? Existing attempts remain unchanged.')) return;
    setSaving(true); setError(''); setNotice('');
    const { error: deleteError } = await supabase.from('certification_final_questions').delete().eq('id', question.id);
    if (deleteError) setError(deleteError.message); else { setQuestions((items) => items.filter((item) => item.id !== question.id)); setNotice('Question deleted.'); }
    setSaving(false);
  }

  function editQuestion(id: string, patch: Partial<CertificationAdminQuestion>) {
    setQuestions((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  if (loading) return <p className="py-10 text-sm text-ink-muted">Loading certification workspace…</p>;

  return <div className="animate-fade-up space-y-8">
    <header className="border-b border-line pb-8"><p className="eyebrow text-bronze-600">Administration</p><h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">Certification</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">Review course readiness, write the bilingual final question bank, and publish the programme only after its requirements are met.</p></header>
    {(error || notice) && <p role={error ? 'alert' : 'status'} className={`border p-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-forest-200 bg-forest-50 text-forest-800'}`}>{error || notice}</p>}
    <section className="grid gap-4 sm:grid-cols-3"><Metric label="Approved modules" value={`${readyCount}/48`} /><Metric label="Active final questions" value={activeCount} /><Metric label="Programme" value={settings?.programme_enabled ? 'Enabled' : 'Disabled'} /></section>
    {settings && <section className="space-y-4 border border-line bg-surface p-5 sm:p-7"><div><h2 className="font-display text-xl text-ink">Programme settings</h2><p className="mt-1 text-sm text-ink-muted">Publishing and programme activation remain blocked until every module and question is ready.</p></div><label className="flex items-center gap-3 text-sm text-ink"><input type="checkbox" checked={settings.final_assessment_published} disabled={saving} onChange={(event) => void saveSettings({ final_assessment_published: event.target.checked })} /> Publish final assessment</label><label className="flex items-center gap-3 text-sm text-ink"><input type="checkbox" checked={settings.programme_enabled} disabled={saving} onChange={(event) => void saveSettings({ programme_enabled: event.target.checked })} /> Enable certification programme</label><label className="block max-w-xs text-xs font-semibold text-ink-muted">Passing score (%)<input className="field-input mt-1" type="number" min="1" max="100" value={settings.pass_percentage} disabled={saving} onChange={(event) => setSettings({ ...settings, pass_percentage: Number(event.target.value) })} onBlur={() => void saveSettings({ pass_percentage: settings.pass_percentage })} /></label></section>}
    <section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-xl text-ink">Module review</h2><p className="mt-1 text-sm text-ink-muted">A module can be approved only when its published lesson has real sections.</p></div><Link to="/admin/laws" className="btn-secondary">Review law content</Link></div><div className="divide-y divide-line border border-line bg-surface">{modules.map((module) => { const law = laws.find((item) => item.slug === module.law_slug); const hasContent = Boolean(law && law.isPublished !== false && law.sections?.length); return <div key={module.law_slug} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-ink">Law {String(module.law_number).padStart(2, '0')}: {law?.titleEn ?? module.law_slug}</p><p className="mt-1 text-xs text-ink-muted">{hasContent ? `${law?.sections?.length} lesson sections` : 'Published lesson content is incomplete'} · {module.is_ready ? `Approved ${module.reviewed_at ? new Date(module.reviewed_at).toLocaleDateString() : ''}` : 'Not approved'}</p></div><button type="button" className={module.is_ready ? 'btn-secondary' : 'btn-primary'} disabled={saving || (!module.is_ready && !hasContent)} onClick={() => void setModuleReady(module, !module.is_ready)}>{module.is_ready ? 'Remove approval' : 'Approve module'}</button></div>; })}</div></section>
    <section className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-xl text-ink">Final question bank</h2><p className="mt-1 text-sm text-ink-muted">Answers and explanations stay private and are used only by secure server-side grading.</p></div><button type="button" className="btn-primary" disabled={saving} onClick={() => void addQuestion()}><Plus size={16} /> Add question</button></div>{questions.length === 0 ? <div className="flex items-start gap-3 border border-bronze-200 bg-bronze-50 p-4 text-sm text-ink-muted"><AlertTriangle size={18} className="mt-0.5 shrink-0 text-bronze-700" /><p>No question bank exists yet. Add reviewed bilingual questions before publication.</p></div> : questions.map((question, index) => <QuestionEditor key={question.id} question={question} index={index} saving={saving} onChange={(patch) => editQuestion(question.id, patch)} onSave={() => void saveQuestion(question)} onDelete={() => void deleteQuestion(question)} />)}</section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="border border-line bg-surface p-5"><p className="font-display text-3xl text-ink">{value}</p><p className="mt-1 text-xs text-ink-muted">{label}</p></div>; }

function QuestionEditor({ question, index, saving, onChange, onSave, onDelete }: { question: CertificationAdminQuestion; index: number; saving: boolean; onChange: (patch: Partial<CertificationAdminQuestion>) => void; onSave: () => void; onDelete: () => void }) {
  const optsEn = options(question.options_en); const optsBn = options(question.options_bn);
  return <article className="space-y-4 border border-line bg-surface p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-ink">Question {index + 1}</h3><label className="flex items-center gap-2 text-xs text-ink-muted"><input type="checkbox" checked={question.is_active} onChange={(event) => onChange({ is_active: event.target.checked })} /> Include in published assessment</label></div><div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-semibold text-ink-muted">Question (English)<textarea className="field-input mt-1 min-h-20" value={question.question_en} onChange={(event) => onChange({ question_en: event.target.value })} /></label><label className="text-xs font-semibold text-ink-muted">প্রশ্ন (বাংলা)<textarea className="field-input mt-1 min-h-20 font-bengali" value={question.question_bn} onChange={(event) => onChange({ question_bn: event.target.value })} /></label></div><div className="grid gap-3 md:grid-cols-2"><fieldset className="space-y-2"><legend className="text-xs font-semibold text-ink-muted">English options — choose correct answer</legend>{optsEn.map((value, optionIndex) => <label key={optionIndex} className="flex items-center gap-2"><input type="radio" name={`correct-${question.id}`} checked={question.correct_option === optionIndex} onChange={() => onChange({ correct_option: optionIndex })} /><input aria-label={`English option ${optionIndex + 1}`} className="field-input" value={value} onChange={(event) => { const next = [...optsEn]; next[optionIndex] = event.target.value; onChange({ options_en: next }); }} /></label>)}</fieldset><fieldset className="space-y-2"><legend className="text-xs font-semibold text-ink-muted">বাংলা বিকল্প</legend>{optsBn.map((value, optionIndex) => <input key={optionIndex} aria-label={`বাংলা বিকল্প ${optionIndex + 1}`} className="field-input font-bengali" value={value} onChange={(event) => { const next = [...optsBn]; next[optionIndex] = event.target.value; onChange({ options_bn: next }); }} />)}</fieldset></div><div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-semibold text-ink-muted">Explanation (English)<textarea className="field-input mt-1 min-h-20" value={question.explanation_en} onChange={(event) => onChange({ explanation_en: event.target.value })} /></label><label className="text-xs font-semibold text-ink-muted">ব্যাখ্যা (বাংলা)<textarea className="field-input mt-1 min-h-20 font-bengali" value={question.explanation_bn} onChange={(event) => onChange({ explanation_bn: event.target.value })} /></label></div><div className="flex flex-wrap gap-3"><button type="button" className="btn-primary" disabled={saving} onClick={onSave}><Save size={15} /> Save question</button><button type="button" className="btn-ghost text-red-700" disabled={saving} onClick={onDelete}><Trash2 size={15} /> Delete</button>{question.is_active && <span className="inline-flex items-center gap-1 text-xs text-forest-700"><Check size={14} /> Active in bank</span>}</div></article>;
}
