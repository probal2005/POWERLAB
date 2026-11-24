import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

export default function LessonNotes({ userId, slug }: { userId: string; slug: string }) {
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void supabase.from('student_lesson_notes').select('note')
      .eq('user_id', userId).eq('law_slug', slug).abortSignal(controller.signal).maybeSingle()
      .then(({ data, error }) => {
        if (controller.signal.aborted) return;
        if (error) setError('Could not load your note.');
        else { setNote(data?.note ?? ''); setLoaded(true); }
      });
    return () => controller.abort();
  }, [userId, slug]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loaded || busy) return;
    setBusy(true);
    setSaved(false);
    setError('');
    const table = supabase.from('student_lesson_notes');
    const { error } = await (note.trim()
      ? table.upsert({ user_id: userId, law_slug: slug, note, updated_at: new Date().toISOString() }, { onConflict: 'user_id,law_slug' })
      : table.delete().eq('user_id', userId).eq('law_slug', slug));
    if (error) setError('Could not save your note.');
    else setSaved(true);
    setBusy(false);
  }

  return (
    <form onSubmit={(event) => void save(event)} className="mt-8 space-y-3 border border-line bg-surface p-5">
      <label className="block text-sm font-semibold">Private lesson note
        <textarea className="field-input mt-2" value={note} rows={4} maxLength={5000}
          disabled={!loaded || busy} onChange={(event) => { setNote(event.target.value); setSaved(false); }} />
      </label>
      <button type="submit" className="btn-secondary" disabled={!loaded || busy}>Save note</button>
      {error && <div role="alert" className="text-sm text-red-800">{error}</div>}
      {saved && <div role="status" className="text-sm text-forest-700">Note saved.</div>}
    </form>
  );
}
