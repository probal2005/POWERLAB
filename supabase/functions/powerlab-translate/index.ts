import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers });

type Entry = { key: string; text: string };
const publicKey = /^(ui:.+|category:[a-z0-9-]+:label|law:[a-z0-9-]+:(title|short|section:\d+:(heading|body:\d+)))$/s;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed.' });

  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return reply(401, { error: 'Sign in as an administrator.' });
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return reply(503, { error: 'Translation service is unavailable.' });
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return reply(401, { error: 'Sign in as an administrator.' });
  const { data: profile } = await client.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (profile?.role !== 'admin') return reply(403, { error: 'Administrator access required.' });

  const apiKey = Deno.env.get('GOOGLE_CLOUD_TRANSLATE_API_KEY');

  try {
    const raw = await request.text();
    if (raw.length > 400000) return reply(413, { error: 'Translation catalogue is too large.' });
    const { action, code, entries } = JSON.parse(raw) as { action?: unknown; code?: unknown; entries?: unknown };
    if (action === 'status') return reply(200, { configured: Boolean(apiKey) });
    if (!apiKey) return reply(503, { error: 'Google Cloud Translation has not been configured.' });
    if (typeof code !== 'string' || !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(code) || ['en', 'bn'].includes(code) ||
        !Array.isArray(entries) || !entries.length || entries.length > 2000 ||
        !entries.every((entry): entry is Entry => entry && typeof entry.key === 'string' &&
          entry.key.length <= 500 && publicKey.test(entry.key) && typeof entry.text === 'string' &&
          entry.text.length > 0 && entry.text.length <= 4000) ||
        new Set(entries.map(({ key }) => key)).size !== entries.length) {
      return reply(400, { error: 'Choose a valid language and provide an eligible catalogue.' });
    }

    const { data: existing, error: lookupError } = await client.from('site_languages')
      .select('is_enabled').eq('code', code).maybeSingle();
    if (lookupError) return reply(500, { error: 'Could not check the language catalogue.' });
    if (existing?.is_enabled) return reply(409, { error: 'This language is already published.' });

    const labels = (locale: string) => new Intl.DisplayNames([locale], { type: 'language', fallback: 'none' }).of(code) ?? code;
    const output: { translation_key: string; value: string }[] = [];
    for (let start = 0; start < entries.length; start += 20) {
      const batch = entries.slice(start, start + 20);
      const response = await fetch('https://translation.googleapis.com/language/translate/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
        body: JSON.stringify({ q: batch.map(({ text }) => text), source: 'en', target: code, format: 'text' }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return reply(502, { error: 'Google could not translate this catalogue. Check the language, Cloud Translation access, and quota.' });
      const result = await response.json();
      const translations = result.data?.translations;
      if (!Array.isArray(translations) || translations.length !== batch.length ||
          !translations.every((item) => typeof item.translatedText === 'string' && item.translatedText.trim())) {
        return reply(502, { error: 'Google returned an incomplete translation.' });
      }
      output.push(...batch.map(({ key }, index) => ({ translation_key: key, value: translations[index].translatedText })));
    }
    if (!existing) {
      const { error: insertError } = await client.from('site_languages').insert({
        code, name_en: labels('en'), name_native: labels(code), is_enabled: false, sort_order: 50,
      });
      if (insertError) return reply(409, { error: 'Could not create the language. Refresh and check whether it already exists.' });
    }
    for (let start = 0; start < output.length; start += 250) {
      const rows = output.slice(start, start + 250).map((item) => ({
        ...item, language_code: code, updated_by: data.user.id, updated_at: new Date().toISOString(),
      }));
      const { error: saveError } = await client.from('site_translations').upsert(rows, { onConflict: 'language_code,translation_key' });
      if (saveError) return reply(500, { error: 'The language remains unpublished because translations could not be saved.' });
    }
    const { error: publishError } = await client.from('site_languages')
      .update({ is_enabled: true, updated_at: new Date().toISOString() }).eq('code', code).select('code').single();
    if (publishError) return reply(500, { error: 'Translations were saved, but the language could not be published.' });
    return reply(200, { code, translated: output.length });
  } catch {
    return reply(502, { error: 'The translation request could not be completed.' });
  }
});
