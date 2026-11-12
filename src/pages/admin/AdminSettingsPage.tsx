import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CertificationProgramSettings } from '@/types/certification';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<CertificationProgramSettings | null>(null);
  const [readyModules, setReadyModules] = useState(0);
  const [activeQuestions, setActiveQuestions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true); setError('');
    const [settingsResult, moduleResult, questionResult] = await Promise.all([
      supabase.from('certification_program_settings').select('*').eq('id', true).maybeSingle(),
      supabase.from('certification_modules').select('is_ready'),
      supabase.from('certification_final_questions').select('id').eq('is_active', true),
    ]);
    const firstError = settingsResult.error ?? moduleResult.error ?? questionResult.error;
    if (firstError) setError(firstError.message);
    setSettings((settingsResult.data ?? null) as CertificationProgramSettings | null);
    setReadyModules((moduleResult.data ?? []).filter((row) => row.is_ready).length);
    setActiveQuestions((questionResult.data ?? []).length);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function save(patch: Partial<CertificationProgramSettings>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    if (patch.programme_enabled || patch.final_assessment_published) {
      const [modules, questions] = await Promise.all([
        supabase.from('certification_modules').select('is_ready'),
        supabase.from('certification_final_questions').select('id').eq('is_active', true),
      ]);
      if (modules.error || questions.error) { setError(modules.error?.message ?? questions.error?.message ?? 'Could not verify publication prerequisites.'); return; }
      const approvedCount = modules.data?.filter((module) => module.is_ready).length ?? 0;
      if (approvedCount !== 48) { setError('Approve all 48 complete modules before publishing or enabling certification.'); return; }
      if (patch.final_assessment_published && !(questions.data?.length)) { setError('Add and activate reviewed questions before publishing the final assessment.'); return; }
    }
    if (next.programme_enabled && !next.final_assessment_published) { setError('Publish the final assessment before enabling the programme.'); return; }
    setSaving(true); setError(''); setMessage('');
    const { data: authData } = await supabase.auth.getUser();
    const { error: updateError } = await supabase.from('certification_program_settings').update({ programme_enabled: next.programme_enabled, final_assessment_published: next.final_assessment_published, pass_percentage: next.pass_percentage, updated_by: authData.user?.id ?? null }).eq('id', true);
    if (updateError) setError(updateError.message); else { setSettings(next); setMessage('Settings saved.'); }
    setSaving(false);
  }

  if (loading) return <p className="py-10 text-sm text-ink-muted">Loading platform settings…</p>;

  return <div className="animate-fade-up space-y-7"><header className="border-b border-line pb-8"><p className="eyebrow text-bronze-600">Administration</p><h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">Platform settings</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">Manage the available programme controls and check their prerequisites.</p></header>
    {(error || message) && <p role={error ? 'alert' : 'status'} className={`border p-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-forest-200 bg-forest-50 text-forest-800'}`}>{error || message}</p>}
    {!settings ? <p className="border border-line bg-surface p-5 text-sm text-ink-muted">Platform settings are not available from the database.</p> : <>
      <div className="grid gap-4 sm:grid-cols-3"><Metric label="Approved lessons" value={`${readyModules}/48`} /><Metric label="Active final questions" value={activeQuestions} /><Metric label="Certification" value={settings.programme_enabled ? 'Enabled' : 'Disabled'} /></div>
      <section className="space-y-5 border border-line bg-surface p-6 sm:p-8"><div className="flex items-start gap-3"><Settings2 size={20} className="mt-0.5 text-forest-700" /><div><h2 className="font-display text-xl text-ink">Certification programme</h2><p className="mt-1 text-sm text-ink-muted">Publication controls have server-enforced content and question-bank prerequisites.</p></div></div>
        <label className="flex items-center gap-3 text-sm text-ink"><input type="checkbox" checked={settings.final_assessment_published} disabled={saving} onChange={(event) => void save({ final_assessment_published: event.target.checked })} /> Publish final assessment</label>
        <label className="flex items-center gap-3 text-sm text-ink"><input type="checkbox" checked={settings.programme_enabled} disabled={saving} onChange={(event) => void save({ programme_enabled: event.target.checked })} /> Enable certification programme</label>
        <label className="block max-w-xs text-xs font-semibold text-ink-muted">Passing score (%)<input className="field-input mt-1" type="number" min="1" max="100" value={settings.pass_percentage} disabled={saving} onChange={(event) => setSettings({ ...settings, pass_percentage: Math.max(1, Math.min(100, Number(event.target.value) || 1)) })} onBlur={() => void save({ pass_percentage: settings.pass_percentage })} /></label>
        <Link to="/admin/certification" className="btn-secondary w-fit"><ShieldCheck size={15} /> Review modules and questions</Link>
      </section>
      <p className="text-xs leading-relaxed text-ink-muted">Authentication security policies are managed by Supabase. No service secret is stored in this admin page.</p>
    </>}
  </div>;
}

function Metric({ label, value }: { label: string; value: number | string }) { return <div className="border border-line bg-surface p-5"><p className="font-display text-3xl text-ink">{value}</p><p className="mt-1 text-xs text-ink-muted">{label}</p></div>; }
