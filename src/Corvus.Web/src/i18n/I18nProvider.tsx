import React, { useState, useEffect, useMemo, type ReactNode } from 'react';
import type { Language, TranslationKey } from './types';
import { 
  I18nContext, 
  dictionaries, 
  STORAGE_KEY, 
  getInitialLanguage, 
  translateKey 
} from './context';

export const I18nProvider: React.FC<{ children: ReactNode; initialLanguage?: Language }> = ({
  children,
  initialLanguage,
}) => {
  const [language, setLanguageState] = useState<Language>(() => initialLanguage ?? getInitialLanguage());

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {
      // ignore
    }
  }, [language]);

  const dict = useMemo(() => dictionaries[language] || dictionaries.en, [language]);

  const t = useMemo(() => {
    return (key: TranslationKey, params?: Record<string, string | number>): string => {
      return translateKey(dict, key, params);
    };
  }, [dict]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};
