import { useEffect, useState, type FormEvent } from 'react';
import { useContent } from '@/context/ContentContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { uiTranslationCatalog } from '@/data/uiTranslationCatalog';

export default function AdminLanguagesPage() {
  const { laws, categories, loading, error: contentError } = useContent();
  const { languages, refreshLanguages } = useLanguage();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    void supabase.functions.invoke('powerlab-translate', { body: { action: 'status' } })
      .then(({ data, error: statusError }) => {
        if (!active) return;
        if (statusError) setError('Could not check the translation service.');
        setConfigured(!statusError && data?.configured === true);
      });
    return () => { active = false; };
  }, []);

  async function addLanguage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = code.trim();
    if (!configured || busy || loading || contentError || !laws.length || !target) return;
    setBusy(true);
    setError('');
    setNotice('');
    const catalogue = new Map<string, string>();
    const add = (key: string, text: string) => {
      if (key.length <= 500 && text.trim()) catalogue.set(key, text);
    };
    for (const item of uiTranslationCatalog) add(`ui:${item.english}`, item.english);
    for (const item of categories) add(`category:${item.id}:label`, item.labelEn);
    for (const law of laws.filter((item) => item.isPublished !== false)) {
      const prefix = `law:${law.slug}`;
      add(`${prefix}:title`, law.titleEn);
      add(`${prefix}:short`, law.shortEn);
      law.sections?.forEach((section, index) => {
        add(`${prefix}:section:${index}:heading`, section.headingEn);
        section.bodyEn.forEach((text, paragraph) => add(`${prefix}:section:${index}:body:${paragraph}`, text));
      });
    }

    try {
      const { data, error: requestError } = await supabase.functions.invoke('powerlab-translate', {
        body: { code: target, entries: Array.from(catalogue, ([key, text]) => ({ key, text })) },
      });
      if (requestError) {
        const detail = requestError.context instanceof Response
          ? await requestError.context.json().catch(() => null) : null;
        setError(detail?.error ?? 'Automatic translation is unavailable. Check the Google Cloud Translation configuration.');
      } else {
        await refreshLanguages();
        setNotice(`Language published with ${data.translated} translated entries.`);
        setCode('');
      }
    } catch {
      setError('The language could not be generated. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <header className="border-b border-line pb-8">
        <h1 className="font-display text-3xl text-ink">Languages</h1>
        <p className="mt-3 text-sm text-ink-muted">Generate a language with Google Cloud Translation from the English interface catalogue and published lessons.</p>
      </header>
      <section className="space-y-4 border border-line bg-surface p-5 sm:p-7">
        <h2 className="font-display text-xl text-ink">Add a language</h2>
        {configured === null && <p role="status" className="text-sm text-ink-muted">Checking Google Cloud Translation…</p>}
        {configured === false && <p className="text-sm text-ink-muted">To enable automatic translation, set GOOGLE_CLOUD_TRANSLATE_API_KEY in Supabase Edge Function secrets.</p>}
        <form onSubmit={(event) => void addLanguage(event)} className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">Google language code
            <input className="field-input mt-1" placeholder="hi, fr, es" value={code} disabled={busy}
              required pattern="[a-z]{2,3}(-[A-Za-z0-9]{2,8})*" onChange={(event) => setCode(event.target.value)} />
          </label>
          <button type="submit" className="btn-primary" disabled={!configured || busy || loading || Boolean(contentError) || !laws.length}>
            {busy ? 'Translating…' : 'Translate and publish'}
          </button>
        </form>
        {(error || contentError) && <p role="alert" className="text-sm text-red-800">{error || contentError}</p>}
        {notice && <p role="status" className="text-sm text-forest-700">{notice}</p>}
      </section>
      <section className="space-y-4 border border-line bg-surface p-5 sm:p-7">
        <h2 className="font-display text-xl text-ink">Published languages</h2>
        <ul className="flex flex-wrap gap-2">{languages.map((language) =>
          <li key={language.code} className="border border-line px-3 py-2 text-sm">{language.nameNative} ({language.code})</li>)}</ul>
      </section>
    </div>
  );
}
