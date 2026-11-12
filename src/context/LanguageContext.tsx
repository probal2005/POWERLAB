import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type Language = 'en' | 'bn';

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggle: () => void;
  t: (en: string, bn: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      toggle: () => setLanguage((prev) => (prev === 'en' ? 'bn' : 'en')),
      t: (en, bn) => (language === 'en' ? en : bn),
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
