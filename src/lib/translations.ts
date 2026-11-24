import { supabase } from '@/lib/supabase';

export async function loadSiteTranslations(language: string, signal: AbortSignal) {
  const pageSize = 500;
  const entries: [string, string][] = [];

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase.from('site_translations')
      .select('translation_key,value')
      .eq('language_code', language)
      .order('translation_key')
      .range(start, start + pageSize - 1)
      .abortSignal(signal);
    if (error) throw error;

    entries.push(...data.map(({ translation_key, value }) => [translation_key, value] as [string, string]));
    if (data.length < pageSize) return Object.fromEntries(entries);
  }
}
