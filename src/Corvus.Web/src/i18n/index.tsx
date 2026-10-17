import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { en } from './en';
import { tr } from './tr';
import type { Language, TranslationDictionary, TranslationKey } from './types';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const dictionaries: Record<Language, TranslationDictionary> = {
  en,
  tr
};

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'corvus_language';

const getInitialLanguage = (): Language => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved === 'en' || saved === 'tr') {
      return saved;
    }
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('tr')) {
      return 'tr';
    }
  } catch {
    // localStorage not accessible
  }
  return 'en';
};

export const translateKey = (
  dict: TranslationDictionary,
  key: TranslationKey,
  params?: Record<string, string | number>
): string => {
  const parts = key.split('.');
  let current: unknown = dict;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      // Fallback to English dictionary if key is missing in active language
      let fallback: unknown = dictionaries.en;
      for (const fPart of parts) {
        if (fallback && typeof fallback === 'object' && fPart in fallback) {
          fallback = (fallback as Record<string, unknown>)[fPart];
        } else {
          fallback = null;
          break;
        }
      }
      current = fallback ?? key;
      break;
    }
  }

  if (typeof current !== 'string') {
    return key;
  }

  if (!params) {
    return current;
  }

  // Replace {key} parameters
  return current.replace(/\{(\w+)\}/g, (_, k) => {
    return k in params ? String(params[k]) : `{${k}}`;
  });
};

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

const defaultContext: I18nContextType = {
  language: 'tr',
  setLanguage: () => {},
  t: (key: TranslationKey, params?: Record<string, string | number>) =>
    translateKey(dictionaries.tr, key, params),
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  return context ?? defaultContext;
};

export * from './types';
