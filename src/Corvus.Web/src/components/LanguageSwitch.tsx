import React from 'react';
import { useI18n, type Language } from '../i18n';
import { Globe } from 'lucide-react';
import { api } from '../api/client';

interface LanguageSwitchProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export const LanguageSwitch: React.FC<LanguageSwitchProps> = ({ variant = 'compact', className = '' }) => {
  const { language, setLanguage } = useI18n();

  const handleToggle = (lang: Language) => {
    if (language !== lang) {
      setLanguage(lang);
      api.updateSettings({ system_language: lang }).catch(() => {});
    }
  };

  if (variant === 'full') {
    return (
      <div className={`inline-flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 ${className}`}>
        <button
          type="button"
          onClick={() => handleToggle('en')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            language === 'en'
              ? 'bg-white text-black font-semibold shadow-xs'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <span>English</span>
        </button>
        <button
          type="button"
          onClick={() => handleToggle('tr')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            language === 'tr'
              ? 'bg-white text-black font-semibold shadow-xs'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <span>Türkçe</span>
        </button>
      </div>
    );
  }

  // Compact variant for sidebar or headers
  return (
    <div className={`inline-flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono ${className}`}>
      <span className="pl-1.5 pr-0.5 text-white/40">
        <Globe className="w-3 h-3" />
      </span>
      <button
        type="button"
        onClick={() => handleToggle('en')}
        className={`px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
          language === 'en'
            ? 'bg-white text-black shadow-xs'
            : 'text-white/60 hover:text-white'
        }`}
        title="Switch to English"
      >
        EN
      </button>
      <span className="text-white/20">/</span>
      <button
        type="button"
        onClick={() => handleToggle('tr')}
        className={`px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
          language === 'tr'
            ? 'bg-white text-black shadow-xs'
            : 'text-white/60 hover:text-white'
        }`}
        title="Türkçe'ye Geç"
      >
        TR
      </button>
    </div>
  );
};
