import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, AlertCircle } from 'lucide-react';
import { useI18n } from '../i18n';

interface EmailRecipientInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailRecipientInput: React.FC<EmailRecipientInputProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false
}) => {
  const { t } = useI18n();
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Gelen string/JSON dizisini yerel state'e dönüştür
  useEffect(() => {
    if (!value || !value.trim()) {
      setEmails([]);
      return;
    }

    const trimmed = value.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          setEmails(parsed.filter((e): e is string => typeof e === 'string' && EMAIL_REGEX.test(e.trim())));
          return;
        }
      } catch {}
    }

    // Virgül veya boşlukla ayrılmış düz metin fallback'i
    const list = trimmed
      .split(/[,;\s]+/)
      .map(e => e.trim())
      .filter(e => EMAIL_REGEX.test(e));
    setEmails([...new Set(list)]);
  }, [value]);

  const updateParent = (newEmails: string[]) => {
    setEmails(newEmails);
    onChange(JSON.stringify(newEmails));
  };

  const addEmail = (raw: string) => {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return;

    if (!EMAIL_REGEX.test(trimmed)) {
      setInputError(t('settings.invalidEmailFormat') || 'Geçerli bir e-posta formatı girin');
      return;
    }

    if (emails.includes(trimmed)) {
      setInputError(t('settings.emailAlreadyAdded') || 'Bu e-posta zaten eklenmiş');
      return;
    }

    setInputError(null);
    setInputValue('');
    updateParent([...emails, trimmed]);
  };

  const removeEmail = (indexToRemove: number) => {
    if (disabled) return;
    updateParent(emails.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      addEmail(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      // Input boşken backspace'e basıldığında son etiketi sil
      removeEmail(emails.length - 1);
    } else {
      if (inputError) setInputError(null);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    // Virgül, noktalı virgül, boşluk veya yeni satır ile ayrılmış e-postaları ayıkla
    const parsed = pasted
      .split(/[,;\s\n\r]+/)
      .map(item => item.trim().toLowerCase())
      .filter(item => EMAIL_REGEX.test(item));

    if (parsed.length > 0) {
      const merged = [...new Set([...emails, ...parsed])];
      updateParent(merged);
      setInputValue('');
      setInputError(null);
    } else {
      setInputError(t('settings.invalidEmailFormat') || 'Geçerli bir e-posta formatı bulunamadı');
    }
  };

  return (
    <div className="space-y-1.5">
      <div
        onClick={() => inputRef.current?.focus()}
        className={`w-full min-h-[42px] bg-white/[0.04] border rounded-xl p-1.5 flex flex-wrap gap-1.5 items-center transition-colors cursor-text ${
          inputError
            ? 'border-rose-500/80 focus-within:border-rose-500'
            : 'border-white/10 focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/20'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {emails.map((email, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-white/[0.08] border border-white/15 text-white shadow-2xs group animate-in fade-in zoom-in-95 duration-150"
          >
            <Mail className="w-3 h-3 text-white/70 shrink-0" />
            <span>{email}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeEmail(idx);
                }}
                className="text-white/40 hover:text-rose-400 transition-colors p-0.5 rounded cursor-pointer"
                title={t('common.delete') || 'Sil'}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (inputError) setInputError(null);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            if (inputValue.trim()) {
              addEmail(inputValue);
            }
          }}
          placeholder={emails.length === 0 ? (placeholder || 'devops@company.com (Enter ile ekleyin)') : ''}
          className="flex-1 min-w-[160px] bg-transparent text-xs text-[#e5e7eb] font-mono px-2 py-1 focus:outline-none placeholder:text-[#9ca3af]/50"
        />
      </div>

      {inputError && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-400 animate-in fade-in duration-150">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{inputError}</span>
        </div>
      )}

      <p className="text-[10px] text-[#9ca3af]/70">
        {t('settings.emailPillsHelp') || 'E-posta adresini yazıp Enter veya virgül tuşuna basın. Birden fazla adresi doğrudan yapıştırabilirsiniz.'}
      </p>
    </div>
  );
};
