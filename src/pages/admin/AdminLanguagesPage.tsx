import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, ChevronLeft, ChevronRight, Languages, Plus, Save, Search, ShieldCheck } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { uiTranslationCatalog } from '@/data/uiTranslationCatalog';
import { psychologyTranslationCatalog } from '@/components/PsychologyCarousel';

type LanguageRow = { code: string; name_en: string; name_native: string; is_enabled: boolean; sort_order: number };
type StoredTranslation = { translation_key: string; value: string };
type TranslationEntry = { key: string; group: string; label: string; english: string; bengali: string };
type FinalQuestion = { id: string; question_en: string; question_bn: string; options_en: string[]; options_bn: string[]; explanation_en: string; explanation_bn: string };

const PAGE_SIZE = 40;

function buildEntries(laws: ReturnType<typeof useContent>['laws'], categories: ReturnType<typeof useContent>['categories'], finalQuestions: FinalQuestion[]): TranslationEntry[] {
  const entries: TranslationEntry[] = uiTranslationCatalog.map(({ english, bengali }) => ({ key: `ui:${english}`, group: 'Website interface', label: english, english, bengali }));
  for (const item of psychologyTranslationCatalog) entries.push({ key: item.key, group: 'Psychology carousel', label: item.label, english: item.english, bengali: item.bengali });
  for (const category of categories) entries.push({ key: `category:${category.id}:label`, group: 'Categories', label: category.labelEn, english: category.labelEn, bengali: category.labelBn });
  for (const law of laws) {
    entries.push({ key: `law:${law.slug}:title`, group: `Law ${String(law.number).padStart(2, '0')}`, label: `${law.titleEn} · title`, english: law.titleEn, bengali: law.titleBn });
    if (law.shortEn || law.shortBn) entries.push({ key: `law:${law.slug}:short`, group: `Law ${String(law.number).padStart(2, '0')}`, label: 'Summary', english: law.shortEn, bengali: law.shortBn });
    for (const [sectionIndex, section] of (law.sections ?? []).entries()) {
      entries.push({ key: `law:${law.slug}:section:${sectionIndex}:heading`, group: `Law ${String(law.number).padStart(2, '0')}`, label: `Section ${sectionIndex + 1} · heading`, english: section.headingEn, bengali: section.headingBn });
      const paragraphCount = Math.max(section.bodyEn.length, section.bodyBn.length);
      for (let paragraphIndex = 0; paragraphIndex < paragraphCount; paragraphIndex++) {
        const english = section.bodyEn[paragraphIndex] ?? '';
        const bengali = section.bodyBn[paragraphIndex] ?? '';
        if (english || bengali) entries.push({ key: `law:${law.slug}:section:${sectionIndex}:body:${paragraphIndex}`, group: `Law ${String(law.number).padStart(2, '0')}`, label: `Section ${sectionIndex + 1} · paragraph ${paragraphIndex + 1}`, english, bengali });
      }
    }
    for (const question of law.assessment?.questions ?? []) {
      const prefix = `law:${law.slug}:assessment:${question.id}`;
      entries.push({ key: `${prefix}:question`, group: `Law ${String(law.number).padStart(2, '0')} · Assessment`, label: question.questionEn || `Question ${question.id}`, english: question.questionEn, bengali: question.questionBn });
      question.optionsEn.forEach((english, index) => entries.push({ key: `${prefix}:option:${index}`, group: `Law ${String(law.number).padStart(2, '0')} · Assessment`, label: `Question option ${index + 1}`, english, bengali: question.optionsBn[index] }));
      if (question.explanationEn || question.explanationBn) entries.push({ key: `${prefix}:explanation`, group: `Law ${String(law.number).padStart(2, '0')} · Assessment`, label: 'Answer explanation', english: question.explanationEn, bengali: question.explanationBn });
    }
  }
  for (const question of finalQuestions) {
    const prefix = `final:assessment:${question.id}`;
    entries.push({ key: `${prefix}:question`, group: 'Final assessment', label: question.question_en || `Question ${question.id}`, english: question.question_en, bengali: question.question_bn });
    question.options_en.forEach((english, index) => entries.push({ key: `${prefix}:option:${index}`, group: 'Final assessment', label: `Question option ${index + 1}`, english, bengali: question.options_bn[index] ?? '' }));
    if (question.explanation_en || question.explanation_bn) entries.push({ key: `${prefix}:explanation`, group: 'Final assessment', label: 'Answer explanation', english: question.explanation_en, bengali: question.explanation_bn });
  }
  return entries.filter((entry) => entry.english || entry.bengali);
}

export default function AdminLanguagesPage() {
  const { laws, categories } = useContent();
  const { user } = useAuth();
  const { refreshLanguages } = useLanguage();
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [stored, setStored] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [finalQuestions, setFinalQuestions] = useState<FinalQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [form, setForm] = useState({ code: '', nameEn: '', nameNative: '' });

  const loadLanguages = useCallback(async () => {
    const [languageResult, questionsResult] = await Promise.all([
      supabase.from('site_languages').select('code,name_en,name_native,is_enabled,sort_order').order('sort_order').order('code'),
      supabase.from('certification_final_questions').select('id,question_en,question_bn,options_en,options_bn,explanation_en,explanation_bn').order('sort_order'),
    ]);
    if (languageResult.error) {
      setError(`Language settings are unavailable. Apply the latest POWERLAB database migration first. (${languageResult.error.message})`);
      setLoading(false);
      return;
    }
    const rows = (languageResult.data ?? []) as LanguageRow[];
    setLanguages(rows);
    setFinalQuestions((questionsResult.data ?? []) as FinalQuestion[]);
    if (questionsResult.error) setError(`Final assessment translations could not load: ${questionsResult.error.message}`);
    setSelectedCode((current) => !current || !rows.some((item) => item.code === current)
      ? rows.find((item) => item.code !== 'en' && item.code !== 'bn')?.code ?? 'en'
      : current);
    setLoading(false);
  }, []);

  useEffect(() => { void loadLanguages(); }, [loadLanguages]);

  useEffect(() => {
    if (!selectedCode || selectedCode === 'en' || selectedCode === 'bn') {
      setStored({});
      setDrafts({});
      return;
    }
    let active = true;
    void supabase.from('site_translations').select('translation_key,value').eq('language_code', selectedCode)
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) { setError(loadError.message); return; }
        const values = Object.fromEntries(((data ?? []) as StoredTranslation[]).map((row) => [row.translation_key, row.value]));
        setStored(values);
        setDrafts(values);
      });
    return () => { active = false; };
  }, [selectedCode]);

  const entries = useMemo(() => buildEntries(laws, categories, finalQuestions), [laws, categories, finalQuestions]);
  const filteredEntries = useMemo(() => {
    const text = query.trim().toLowerCase();
    return entries.filter((item) => !text || `${item.group} ${item.label} ${item.english} ${item.bengali}`.toLowerCase().includes(text));
  }, [entries, query]);
  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const visibleEntries = filteredEntries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const changedKeys = Object.keys(drafts).filter((key) => (drafts[key] ?? '') !== (stored[key] ?? ''));
  const translatedCount = entries.filter((entry) => Boolean((drafts[entry.key] ?? '').trim())).length;

  useEffect(() => { setPage(0); }, [query, selectedCode]);

  async function createLanguage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = form.code.trim().toLowerCase();
    if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/.test(code)) { setError('Use a language code such as es, fr, or pt-br.'); return; }
    if (!form.nameEn.trim() || !form.nameNative.trim()) { setError('Enter both the language name and its native name.'); return; }
    setSaving(true); setError(''); setNotice('');
    const { error: insertError } = await supabase.from('site_languages').insert({ code, name_en: form.nameEn.trim(), name_native: form.nameNative.trim(), is_enabled: true, sort_order: languages.length });
    if (insertError) setError(insertError.message);
    else {
      setForm({ code: '', nameEn: '', nameNative: '' });
      setSelectedCode(code);
      setNotice(`${form.nameEn.trim()} added. Add translations below; blank entries will show English until translated.`);
      await loadLanguages();
      await refreshLanguages();
    }
    setSaving(false);
  }

  async function updateLanguage(language: LanguageRow, patch: Partial<Pick<LanguageRow, 'name_en' | 'name_native' | 'is_enabled'>>) {
    if (language.code === 'en' && patch.is_enabled === false) { setError('English must remain enabled as the fallback language.'); return; }
    setSaving(true); setError(''); setNotice('');
    const { error: updateError } = await supabase.from('site_languages').update(patch).eq('code', language.code);
    if (updateError) setError(updateError.message);
    else { setNotice(`${language.name_en} settings saved.`); await loadLanguages(); await refreshLanguages(); }
    setSaving(false);
  }

  async function saveTranslations() {
    if (!selectedCode || selectedCode === 'en' || selectedCode === 'bn' || !changedKeys.length) return;
    setSaving(true); setError(''); setNotice('');
    const deleteKeys = changedKeys.filter((key) => !(drafts[key] ?? '').trim() && stored[key]);
    if (deleteKeys.length) {
      const { error: deleteError } = await supabase.from('site_translations').delete().eq('language_code', selectedCode).in('translation_key', deleteKeys);
      if (deleteError) { setError(deleteError.message); setSaving(false); return; }
    }
    const rows = changedKeys.filter((key) => (drafts[key] ?? '').trim()).map((key) => ({ language_code: selectedCode, translation_key: key, value: drafts[key].trim(), updated_by: user?.id ?? null }));
    if (rows.length) {
      const { error: saveError } = await supabase.from('site_translations').upsert(rows, { onConflict: 'language_code,translation_key' });
      if (saveError) { setError(saveError.message); setSaving(false); return; }
    }
    const next = { ...drafts };
    for (const key of deleteKeys) delete next[key];
    setStored(next);
    setDrafts(next);
    setNotice(`${rows.length} translation${rows.length === 1 ? '' : 's'} saved. Changes are now available in the website language selector.`);
    await refreshLanguages();
    setSaving(false);
  }

  if (loading) return <p className="py-10 text-sm text-ink-muted">Loading language settings…</p>;

  return <div className="animate-fade-up space-y-8">
    <header className="border-b border-line pb-8"><p className="eyebrow text-bronze-600">Administration</p><h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">Languages & translations</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">Add languages to the public site and translate interface labels, lessons, categories, and assessments. English and Bengali remain available as the existing source languages.</p></header>
    {(error || notice) && <p role={error ? 'alert' : 'status'} className={`border p-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-forest-200 bg-forest-50 text-forest-800'}`}>{error || notice}</p>}

    <section className="space-y-5 border border-line bg-surface p-5 sm:p-7">
      <div className="flex items-start gap-3"><Languages size={20} className="mt-0.5 text-forest-700" /><div><h2 className="font-display text-xl text-ink">Website languages</h2><p className="mt-1 text-sm text-ink-muted">Enabled languages appear in the public website language selector. English is the fallback.</p></div></div>
      <form onSubmit={createLanguage} className="grid gap-3 md:grid-cols-[0.8fr_1fr_1fr_auto]">
        <label className="text-xs font-semibold text-ink-muted">Language code<input className="field-input mt-1" placeholder="es" value={form.code} maxLength={16} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
        <label className="text-xs font-semibold text-ink-muted">Name in English<input className="field-input mt-1" placeholder="Spanish" value={form.nameEn} onChange={(event) => setForm({ ...form, nameEn: event.target.value })} /></label>
        <label className="text-xs font-semibold text-ink-muted">Native name<input className="field-input mt-1" placeholder="Español" value={form.nameNative} onChange={(event) => setForm({ ...form, nameNative: event.target.value })} /></label>
        <button className="btn-primary self-end" type="submit" disabled={saving}><Plus size={16} /> Add language</button>
      </form>
      <div className="divide-y divide-line border border-line">
        {languages.map((item) => <LanguageEditor key={item.code} language={item} saving={saving} onSave={(patch) => void updateLanguage(item, patch)} />)}
      </div>
    </section>

    <section className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="font-display text-xl text-ink">Translate the website</h2><p className="mt-1 max-w-2xl text-sm text-ink-muted">Translate public interface text and the current law, category, lesson, and assessment content. Missing translations safely fall back to English.</p></div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-ink-muted">Language to translate<select className="field-input mt-1 min-w-44" value={selectedCode} onChange={(event) => setSelectedCode(event.target.value)}>{languages.filter((item) => item.code !== 'en' && item.code !== 'bn').map((item) => <option key={item.code} value={item.code}>{item.name_native} · {item.name_en}</option>)}</select></label>
          <button type="button" className="btn-primary" onClick={() => void saveTranslations()} disabled={saving || !changedKeys.length || !selectedCode || selectedCode === 'en' || selectedCode === 'bn'}><Save size={15} /> Save {changedKeys.length ? `${changedKeys.length} changes` : 'translations'}</button>
        </div>
      </div>
      {!languages.some((item) => item.code !== 'en' && item.code !== 'bn') ? <div className="border border-line bg-surface p-6 text-sm text-ink-muted">Add a language above to start translating the site. The built-in English and Bengali translations remain in the existing content editor.</div> : <>
        <div className="flex flex-wrap items-center justify-between gap-3"><label className="relative block w-full sm:max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" /><input className="field-input pl-9" aria-label="Search translation text" placeholder="Search text, law, or section" value={query} onChange={(event) => setQuery(event.target.value)} /></label><p className="text-xs text-ink-muted">{translatedCount} of {entries.length} entries translated</p></div>
        <div className="divide-y divide-line border border-line bg-surface">
          {visibleEntries.map((entry) => <article key={entry.key} className="grid gap-3 p-4 lg:grid-cols-2 lg:gap-6"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-bronze-600">{entry.group}</p><p className="mt-1 text-sm font-medium text-ink">{entry.label}</p><p className="mt-2 text-sm leading-relaxed text-ink-muted">{entry.english}</p>{entry.bengali && <p className="mt-1 text-sm leading-relaxed text-ink-muted font-bengali">বাংলা: {entry.bengali}</p>}</div><label className="text-xs font-semibold text-ink-muted">{languages.find((item) => item.code === selectedCode)?.name_native ?? selectedCode}<textarea className="field-input mt-1 min-h-20" lang={selectedCode} value={drafts[entry.key] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [entry.key]: event.target.value }))} placeholder="Add a reviewed translation" /></label></article>)}
          {!visibleEntries.length && <p className="p-6 text-sm text-ink-muted">No translation text matches this search.</p>}
        </div>
        <div className="flex items-center justify-between gap-4"><p className="text-xs text-ink-muted">Page {page + 1} of {pageCount}</p><div className="flex gap-2"><button type="button" className="btn-secondary" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><ChevronLeft size={15} /> Previous</button><button type="button" className="btn-secondary" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>Next <ChevronRight size={15} /></button></div></div>
      </>}
    </section>
    <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-muted"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-forest-700" />Only verified administrators can add languages or edit translations. Public visitors can read enabled translations; they cannot change them.</p>
  </div>;
}

function LanguageEditor({ language, saving, onSave }: { language: LanguageRow; saving: boolean; onSave: (patch: Partial<Pick<LanguageRow, 'name_en' | 'name_native' | 'is_enabled'>>) => void }) {
  const [nameEn, setNameEn] = useState(language.name_en);
  const [nameNative, setNameNative] = useState(language.name_native);
  const isCoreLanguage = language.code === 'en' || language.code === 'bn';
  return <div className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
    <label className="text-xs text-ink-muted">{language.code}<input className="field-input mt-1" value={nameEn} disabled={isCoreLanguage} onChange={(event) => setNameEn(event.target.value)} /></label>
    <label className="text-xs text-ink-muted">Native name<input className="field-input mt-1" value={nameNative} disabled={isCoreLanguage} onChange={(event) => setNameNative(event.target.value)} /></label>
    <button type="button" className="btn-secondary" disabled={saving || isCoreLanguage || (nameEn === language.name_en && nameNative === language.name_native)} onClick={() => onSave({ name_en: nameEn.trim(), name_native: nameNative.trim() })}><Save size={14} /> Save name</button>
    <button type="button" className={`btn-secondary ${language.is_enabled ? '' : 'text-ink-muted'}`} disabled={saving || language.code === 'en'} onClick={() => onSave({ is_enabled: !language.is_enabled })}>{language.is_enabled ? <><Check size={14} /> Enabled</> : 'Enable'}</button>
  </div>;
}
