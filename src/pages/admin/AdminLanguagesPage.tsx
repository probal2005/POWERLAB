import { exportTranslationCsv, parseTranslationCsv } from '@/lib/translationCsv';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useContent } from '@/context/ContentContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { loadSiteTranslations } from '@/lib/translations';
import { languageChoices } from '@/data/languageChoices';
import { uiTranslationCatalog } from '@/data/uiTranslationCatalog';

type LanguageRow = { code: string; name_en: string; name_native: string; is_enabled: boolean };
const builtIn = new Set(['en', 'bn']);

export default function AdminLanguagesPage() {
  const { laws, categories, loading, error: contentError } = useContent();
  const { user } = useAuth();
  const { refreshLanguages } = useLanguage();
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [listed, setListed] = useState(false);
  const [code, setCode] = useState('');
  const [languageSearch, setLanguageSearch] = useState('');
  const [activeCode, setActiveCode] = useState('');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('');
  const [entryKey, setEntryKey] = useState('');
  const [text, setText] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const request = new AbortController();
    void supabase.from('site_languages').select('code,name_en,name_native,is_enabled').order('name_en')
      .abortSignal(request.signal).then(({ data, error: loadError }) => {
        if (request.signal.aborted) return;
        if (loadError) setError(loadError.message);
        else { setLanguages(data); setListed(true); }
      });
    return () => request.abort();
  }, []);

  useEffect(() => {
    if (!activeCode) return;
    const request = new AbortController();
    void loadSiteTranslations(activeCode, request.signal).then((data) => {
      if (request.signal.aborted) return;
      setTranslations(data);
      setReady(true);
    }).catch(() => {
      if (!request.signal.aborted) setError('Could not load this language’s saved translations.');
    });
    return () => request.abort();
  }, [activeCode]);

  const catalogue = useMemo(() => {
    const entries = new Map<string, { text: string; label: string }>();
    const add = (key: string, text: string, group: string) => {
      if (key.length <= 500 && text.trim()) entries.set(key, { text, label: `${group} · ${text.slice(0, 90)}` });
    };
    for (const item of uiTranslationCatalog) add(`ui:${item.english}`, item.english, 'Interface');
    for (const category of categories) add(`category:${category.id}:label`, category.labelEn, 'Category');
    for (const law of laws.filter((item) => item.isPublished !== false)) {
      const prefix = `law:${law.slug}`;
      const group = `Law ${law.number}`;
      add(`${prefix}:title`, law.titleEn, group);
      add(`${prefix}:short`, law.shortEn, group);
      law.sections?.forEach((section, index) => {
        add(`${prefix}:section:${index}:heading`, section.headingEn, group);
        section.bodyEn.forEach((body, paragraph) => add(`${prefix}:section:${index}:body:${paragraph}`, body, group));
      });
    }
    return entries;
  }, [categories, laws]);

  const existing = new Set(languages.map((language) => language.code));
  const choices = languageChoices.filter(({ code, name }) =>
    !existing.has(code) && !builtIn.has(code) && name.toLowerCase().includes(languageSearch.trim().toLowerCase()));
  const selected = choices.find((language) => language.code === code);
  const active = languages.find((language) => language.code === activeCode);
  const visibleEntries = Array.from(catalogue).filter(([key, item]) =>
    key === entryKey || item.label.toLowerCase().includes(filter.trim().toLowerCase()));
  const translatedCount = Array.from(catalogue.keys()).filter((key) => Boolean(translations[key]?.trim())).length;

  function editLanguage(next: string) {
    if (next === activeCode) return;
    setActiveCode(next);
    setReady(false);
    setTranslations({});
    setFilter('');
    setEntryKey('');
    setText('');
    setError('');
    setNotice('');
  }

  async function addLanguage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const native = new Intl.DisplayNames([selected.code], { type: 'language', fallback: 'none' }).of(selected.code);
    const { data, error: createError } = await supabase.from('site_languages').insert({
      code: selected.code, name_en: selected.name, name_native: native ?? selected.name, is_enabled: false, sort_order: 50,
    }).select('code,name_en,name_native,is_enabled').single<LanguageRow>();
    if (createError) setError(createError.message);
    else {
      setLanguages((current) => [...current, data]);
      setCode('');
      setLanguageSearch('');
      editLanguage(data.code);
      setNotice(`${data.name_en} draft created.`);
    }
    setBusy(false);
  }

  async function saveTranslation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !ready || busy || !entryKey || !catalogue.has(entryKey) || !text.trim()) return;
    setBusy(true);
    setError('');
    setNotice('');
    const value = text.trim();
    const { error: saveError } = await supabase.from('site_translations').upsert({
      language_code: activeCode, translation_key: entryKey, value,
      updated_by: user.id, updated_at: new Date().toISOString(),
    }, { onConflict: 'language_code,translation_key' });
    if (saveError) setError(saveError.message);
    else {
      setTranslations((current) => ({ ...current, [entryKey]: value }));
      setNotice('Translation saved.');
      if (active?.is_enabled) await refreshLanguages();
    }
    setBusy(false);
  }

  function downloadCsv() {
    const rows: [string, string, string][] = Array.from(catalogue, ([key, item]) => [key, item.text, translations[key] ?? '']);
    const url = URL.createObjectURL(new Blob([exportTranslationCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `powerlab-${activeCode}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importCsv(file: File) {
    if (!user || !ready || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (file.size > 2_000_000) throw new Error('Choose a CSV under 2 MB.');
      const parsed = parseTranslationCsv(await file.text());
      const keys = new Set(parsed.map(([key]) => key));
      if (keys.size !== parsed.length || parsed.some(([key]) => !catalogue.has(key))) {
        throw new Error('The CSV contains duplicate or unknown keys. Start from the exported template.');
      }
      const entries = parsed.filter(([, value]) => value.trim());
      if (!entries.length) throw new Error('Add at least one translation to the CSV.');
      const now = new Date().toISOString();
      const rows = entries.map(([key, value]) => ({
        language_code: activeCode, translation_key: key, value,
        updated_by: user.id, updated_at: now,
      }));
      const { error } = await supabase.from('site_translations').upsert(rows, { onConflict: 'language_code,translation_key' });
      if (error) throw error;
      setTranslations((current) => ({ ...current, ...Object.fromEntries(entries) }));
      setText((current) => new Map(entries).get(entryKey) ?? current);
      if (active?.is_enabled) await refreshLanguages();
      setNotice(`${entries.length} translations imported.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : (error as { message?: string }).message ?? 'Could not import the CSV.');
    } finally {
      setBusy(false);
    }
  }

  async function publish(isEnabled: boolean) {
    if (!active || !ready || busy || (isEnabled && !translatedCount)) return;
    setBusy(true);
    setError('');
    setNotice('');
    const { data, error: publishError } = await supabase.from('site_languages')
      .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() }).eq('code', active.code)
      .select('code,name_en,name_native,is_enabled').single<LanguageRow>();
    if (publishError) setError(publishError.message);
    else {
      setLanguages((current) => current.map((language) => language.code === data.code ? data : language));
      await refreshLanguages();
      setNotice(isEnabled ? 'Language published.' : 'Language moved to drafts.');
    }
    setBusy(false);
  }

  return (
    <div className="space-y-7">
      <header className="border-b border-line pb-8">
        <h1 className="font-display text-3xl text-ink">Languages</h1>
        <p className="mt-3 text-sm text-ink-muted">Add a language and write or paste translations for the interface and published lessons.</p>
      </header>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="text-sm text-forest-700">{notice}</p>}
      <section className="space-y-4 border border-line bg-surface p-5 sm:p-7">
        <h2 className="font-display text-xl text-ink">Add a language</h2>
        <form onSubmit={(event) => void addLanguage(event)} className="flex flex-wrap items-end gap-3">
          <label className="block w-full max-w-xs text-sm">Search language names
            <input className="field-input mt-1" type="search" value={languageSearch} disabled={busy}
              onChange={(event) => { setLanguageSearch(event.target.value); setCode(''); }} />
          </label>
          <label className="block w-full max-w-xs text-sm">Language
            <select className="field-input mt-1" value={selected?.code ?? ''} disabled={!listed || busy || !choices.length}
              required onChange={(event) => setCode(event.target.value)}>
              <option value="">{choices.length ? 'Choose a language' : 'No matching languages'}</option>
              {choices.map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}
            </select>
          </label>
          <button type="submit" className="btn-primary" disabled={busy || !listed || !selected}>Create draft</button>
        </form>
      </section>
      <section className="space-y-4 border border-line bg-surface p-5 sm:p-7">
        <h2 className="font-display text-xl text-ink">Site languages</h2>
        <ul className="flex flex-wrap gap-2">{languages.map((language) => <li key={language.code}>
          {builtIn.has(language.code) ? <span className="inline-block border border-line px-3 py-2 text-sm">{language.name_en} · Built in</span> :
            <button type="button" className="btn-secondary" disabled={busy} aria-pressed={activeCode === language.code}
              onClick={() => editLanguage(language.code)}>{language.name_en} · {language.is_enabled ? 'Published' : 'Draft'}</button>}
        </li>)}</ul>
      </section>
      {active && (
        <section className="space-y-4 border border-line bg-surface p-5 sm:p-7">
          <h2 className="font-display text-xl text-ink">Edit {active.name_en} translations</h2>
          {contentError && <p role="alert" className="text-sm text-red-800">{contentError}</p>}
          {!ready || loading ? <p className="text-sm text-ink-muted">Loading translation entries…</p> : <>
            <p className="text-sm text-ink-muted">{translatedCount} of {catalogue.size} entries translated. Untranslated text falls back to English.</p>
            <div className="flex flex-wrap items-end gap-3">
              <button type="button" className="btn-secondary" disabled={busy || Boolean(contentError)} onClick={downloadCsv}>Export translations CSV</button>
              <label className="block text-sm">Import translations CSV
                <input type="file" accept=".csv,text/csv" className="field-input mt-1"
                  disabled={busy || Boolean(contentError)} onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void importCsv(file);
                  }} />
              </label>
            </div>
            <form onSubmit={(event) => void saveTranslation(event)} className="space-y-4">
              <label className="block text-sm">Search source text
                <input className="field-input mt-1" type="search" value={filter} disabled={busy} onChange={(event) => setFilter(event.target.value)} />
              </label>
              <label className="block text-sm">Text to translate
                <select className="field-input mt-1" value={entryKey} disabled={busy || !visibleEntries.length}
                  onChange={(event) => { setEntryKey(event.target.value); setText(translations[event.target.value] ?? ''); }}>
                  <option value="">{visibleEntries.length ? 'Choose an entry' : 'No matching entries'}</option>
                  {visibleEntries.map(([key, item]) => <option key={key} value={key}>{item.label}{translations[key] ? ' (saved)' : ''}</option>)}
                </select>
              </label>
              {entryKey && <>
                <p className="whitespace-pre-wrap border border-line p-3 text-sm" lang="en">{catalogue.get(entryKey)?.text}</p>
                <label className="block text-sm">Translation
                  <textarea className="field-input mt-1" rows={4} lang={active.code} value={text} disabled={busy} required
                    onChange={(event) => setText(event.target.value)} />
                </label>
                <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>Save translation</button>
              </>}
            </form>
            <button type="button" className="btn-secondary" disabled={busy || Boolean(contentError) || (!active.is_enabled && !translatedCount)}
              onClick={() => void publish(!active.is_enabled)}>{active.is_enabled ? 'Unpublish language' : 'Publish language'}</button>
          </>}
        </section>
      )}
    </div>
  );
}
