import React from 'react';
import { Copy, Check } from 'lucide-react';
import { useI18n } from '../../../i18n';
import type { EditorTab } from '../useComposeConfig';

interface ComposeCodeEditorProps {
  activeTab: EditorTab;
  content: string;
  onChange: (value: string) => void;
  disabled: boolean;
  lineCount: number;
  lineNumbers: number[];
  copied: boolean;
  onCopy: () => void;
}

/** Kod Editörü (Satır Numaraları Gutter + Textarea) */
export const ComposeCodeEditor: React.FC<ComposeCodeEditorProps> = ({
  activeTab,
  content,
  onChange,
  disabled,
  lineCount,
  lineNumbers,
  copied,
  onCopy
}) => {
  const { t } = useI18n();

  return (
    <div className="relative flex-1 min-h-[320px] rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-hidden flex flex-col font-mono text-xs">
      {/* Editör Üst Bar */}
      <div className="px-3.5 py-1.5 bg-[var(--bg-subtle)] border-b border-[var(--border-hairline)] flex items-center justify-between text-[var(--text-muted)]">
        <span className="text-[11px] font-medium font-mono text-[var(--cloud-400)]">
          {activeTab === 'yaml' ? 'compose.yaml' : '.env'} ({lineCount} L)
        </span>

        <button
          onClick={onCopy}
          disabled={!content}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          title={t('common.copy')}
        >
          {copied ? <Check className="w-3 h-3 text-[var(--status-up)]" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? t('common.copied') : t('common.copy')}</span>
        </button>
      </div>

      {/* Editör Gövdesi: Satır Numaraları & Metin Kutusu */}
      <div className="flex-1 flex overflow-hidden">
        {/* Satır Numaraları Gutter */}
        <div
          aria-hidden="true"
          className="w-11 shrink-0 bg-[var(--bg-subtle)] border-r border-[var(--border-hairline)] py-3 select-none text-right pr-2.5 text-[11px] font-mono text-[var(--text-muted)] opacity-60 overflow-hidden leading-relaxed"
        >
          {lineNumbers.map((num) => (
            <div key={num} className="h-[21px]">{num}</div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={activeTab === 'yaml'
            ? '# services:\n#   app:\n#     image: nginx:alpine'
            : t('containers.composeEnvPlaceholder')}
          className="flex-1 p-3 bg-transparent text-[var(--text-primary)] font-mono text-xs leading-[21px] resize-none outline-none selection:bg-[var(--bg-active)] disabled:opacity-50"
          spellCheck={false}
          rows={16}
        />
      </div>
    </div>
  );
};
