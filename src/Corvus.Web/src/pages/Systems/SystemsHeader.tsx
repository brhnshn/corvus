import React from 'react';
import { Server, RefreshCw, Plus } from 'lucide-react';
import { useI18n } from '../../i18n';

interface SystemsHeaderProps {
  totalCount: number;
  onlineCount: number;
  onRefresh: () => void;
  onAddClick: () => void;
  isLoading: boolean;
  isAdmin: boolean;
}

export const SystemsHeader: React.FC<SystemsHeaderProps> = ({
  totalCount,
  onlineCount,
  onRefresh,
  onAddClick,
  isLoading,
  isAdmin
}) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/5">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-white/5 flex items-center justify-center text-[#d5d5dc]">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#eceef6]">
              {t('systems.title')}
            </h1>
            <p className="text-xs text-[#9ba0b5]">
              {t('systems.subtitle')} · {t('systems.activeCount', { online: onlineCount, total: totalCount })}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-[#eceef6] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{t('systems.refresh')}</span>
        </button>

        {isAdmin && (
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d5d5dc] hover:bg-white text-xs font-semibold text-[#0d0e15] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('systems.addSystem')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
