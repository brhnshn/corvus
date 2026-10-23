import React from 'react';
import { Terminal } from 'lucide-react';
import type { ComposeDeployResult } from '../../../types';
import { useI18n } from '../../../i18n';

interface ComposeDeployOutputProps {
  deployResult: ComposeDeployResult;
}

/** Dağıtım Çıktısı (docker compose up -d output console) */
export const ComposeDeployOutput: React.FC<ComposeDeployOutputProps> = ({ deployResult }) => {
  const { t } = useI18n();

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-hidden font-mono text-xs">
      <div className="px-3.5 py-1.5 bg-[var(--bg-subtle)] border-b border-[var(--border-hairline)] flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--cloud-200)] flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5" />
          {t('containers.composeDeployOutput')}
        </span>
        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
          deployResult.success ? 'bg-[var(--status-up-bg)] text-[var(--status-up)]' : 'bg-[var(--status-down-bg)] text-[var(--status-down)]'
        }`}>
          {deployResult.success ? 'SUCCESS (0)' : `FAILED (${deployResult.exitCode})`}
        </span>
      </div>
      <pre className="p-3 text-[11px] text-[var(--text-secondary)] overflow-x-auto max-h-40 leading-snug whitespace-pre-wrap">
        {deployResult.output || deployResult.error || t('common.completed')}
      </pre>
    </div>
  );
};
