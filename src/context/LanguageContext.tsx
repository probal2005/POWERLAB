import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { loadSiteTranslations } from '@/lib/translations';

export type Language = string;

export interface SiteLanguage {
  code: Language;
  nameEn: string;
  nameNative: string;
  isEnabled: boolean;
}

type LanguageContextValue = {
  language: Language;
  languages: SiteLanguage[];
  setLanguage: (lang: Language) => void;
  toggle: () => void;
  t: (en: string, bn: string) => string;
  tx: (key: string, en: string, bn: string) => string;
  refreshLanguages: () => Promise<void>;
};

const defaultLanguages: SiteLanguage[] = [
  { code: 'en', nameEn: 'English', nameNative: 'English', isEnabled: true },
  { code: 'bn', nameEn: 'Bengali', nameNative: 'বাংলা', isEnabled: true },
];

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
const LANGUAGE_STORAGE_KEY = 'powerlab:language';

function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved || 'en';
  } catch {
    return 'en';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setCurrentLanguage] = useState<Language>(getInitialLanguage);
  const [languages, setLanguages] = useState<SiteLanguage[]>(defaultLanguages);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translationRevision, setTranslationRevision] = useState(0);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((code: Language) => {
    setCurrentLanguage(code);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // The language still changes for this session when storage is unavailable.
    }
  }, []);

  const refreshLanguages = useCallback(async () => {
    const { data, error } = await supabase
      .from('site_languages')
      .select('code,name_en,name_native,is_enabled')
      .eq('is_enabled', true)
      .order('sort_order')
      .order('code');

    if (error || !data?.length) return;

    const next = data.map((row) => ({
      code: String(row.code),
      nameEn: String(row.name_en),
      nameNative: String(row.name_native),
      isEnabled: Boolean(row.is_enabled),
    }));
    setLanguages(next);
    if (!next.some((item) => item.code === language)) setLanguage('en');
    setTranslationRevision((revision) => revision + 1);
  }, [language, setLanguage]);

  useEffect(() => {
    void refreshLanguages();
  }, [refreshLanguages]);

  useEffect(() => {
    if (language === 'en' || language === 'bn') {
      setTranslations({});
      return;
    }

    const request = new AbortController();
    setTranslations({});
    void loadSiteTranslations(language, request.signal).then((data) => {
      if (!request.signal.aborted) setTranslations(Object.fromEntries(
        Object.entries(data).filter(([key]) => key.startsWith('ui:') || key.startsWith('category:') ||
          (/^law:[^:]+:(title|short|section:)/.test(key)))
      ));
    }).catch(() => { if (!request.signal.aborted) setTranslations({}); });
    return () => request.abort();
  }, [language, translationRevision]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      languages,
      setLanguage,
      toggle: () => setLanguage(language === 'en' ? 'bn' : 'en'),
      t: (en, bn) => language === 'en' ? en : language === 'bn' ? bn : (translations[`ui:${en}`] || en),
      tx: (key, en, bn) => language === 'en' ? en : language === 'bn' ? bn : (translations[key] || en),
      refreshLanguages,
    }),
    [language, languages, setLanguage, translations, refreshLanguages]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
