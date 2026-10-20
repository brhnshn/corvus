import { createContext, useContext } from 'react';
import { en } from './en';
import { tr } from './tr';
import type { Language, TranslationDictionary, TranslationKey } from './types';

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

export const dictionaries: Record<Language, TranslationDictionary> = {
  en,
  tr
};

export const I18nContext = createContext<I18nContextType | null>(null);

export const STORAGE_KEY = 'corvus_language';

export const getInitialLanguage = (): Language => {
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
