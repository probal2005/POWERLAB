import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<{ programme_enabled: boolean; final_assessment_published: boolean } | null>(null);
  const [passingScore, setPassingScore] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void supabase.from('certification_program_settings')
      .select('programme_enabled,final_assessment_published,pass_percentage').eq('id', true)
      .abortSignal(controller.signal).maybeSingle()
      .then(({ data, error: loadError }) => {
        if (controller.signal.aborted) return;
        if (loadError || !data) {
          setError(loadError?.message ?? 'Programme settings are unavailable.');
        } else {
          setStatus(data);
          setPassingScore(String(data.pass_percentage));
        }
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;
    const score = Number(passingScore);
    if (!Number.isInteger(score) || score < 1 || score > 100) return;
    setSaving(true);
    setError('');
    setMessage('');
    const { error: saveError } = await supabase.from('certification_program_settings')
      .update({ pass_percentage: score, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', true).select('pass_percentage').single();
    if (saveError) setError(saveError.message);
    else setMessage('Passing score saved.');
    setSaving(false);
  }

  return (
    <div className="space-y-7">
      <header className="border-b border-line pb-8">
        <p className="eyebrow">Administration</p>
        <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">Platform settings</h1>
        <p className="mt-3 text-sm text-ink-muted">Review the certification programme status and set the score required to pass the final assessment.</p>
      </header>
      {loading && <p role="status">Loading programme settings…</p>}
      {error && <p role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="border border-forest-200 bg-forest-50 p-4 text-sm">{message}</p>}
      {status && (
        <section className="space-y-5 border border-line bg-surface p-5 sm:p-7">
          <h2 className="font-display text-xl text-ink">Certification programme</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold">Programme</dt><dd>{status.programme_enabled ? 'Enabled' : 'Disabled'}</dd></div>
            <div><dt className="font-semibold">Final assessment</dt><dd>{status.final_assessment_published ? 'Published' : 'Unpublished'}</dd></div>
          </dl>
          <form onSubmit={(event) => void save(event)} className="flex flex-wrap items-end gap-3">
            <label className="block text-sm">Passing score (%)
              <input className="field-input mt-1" type="number" min={1} max={100} step={1} required value={passingScore}
                onChange={(event) => setPassingScore(event.target.value)} disabled={saving} />
            </label>
            <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
          </form>
          <Link to="/admin/certification" className="btn-secondary">Manage issued certificates</Link>
        </section>
      )}
    </div>
  );
}
