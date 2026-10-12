import React from 'react';
import { Database, ShieldCheck } from 'lucide-react';
import type { SystemStatusDto } from '../../types';
import { useI18n } from '../../i18n';

interface SystemsEngineBadgeProps {
  status: SystemStatusDto | null;
}

export const SystemsEngineBadge: React.FC<SystemsEngineBadgeProps> = ({ status }) => {
  const { t } = useI18n();

  if (!status) return null;

  const isPostgres = status.engine === 'postgresql';

  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#1b1d2a]/50 border border-white/5 text-xs text-[#9ba0b5]">
      <div className="flex items-center gap-2">
        <Database className="w-3.5 h-3.5 text-[#d5d5dc]" />
        <span className="font-medium text-[#eceef6]">
          {isPostgres ? t('systems.engineBadge.postgresql') : t('systems.engineBadge.sqliteWal')}
        </span>
      </div>

      <div className="flex items-center gap-3 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#34d399]" />
          <span>RAM: ~{(status.bufferMemoryBytes / 1024).toFixed(0)} KB</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/40">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero-Inbound</span>
        </div>
      </div>
    </div>
  );
};
