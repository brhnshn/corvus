import React from 'react';
import { Server, Plus } from 'lucide-react';
import { useI18n } from '../../i18n';

interface SystemsEmptyStateProps {
  onAddClick: () => void;
  isAdmin: boolean;
}

export const SystemsEmptyState: React.FC<SystemsEmptyStateProps> = ({ onAddClick, isAdmin }) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl bg-[#1b1d2a]/30 border border-white/5">
      <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-[#d5d5dc] mb-4">
        <Server className="w-8 h-8" />
      </div>

      <h3 className="text-lg font-semibold text-[#eceef6] mb-2">
        {t('systems.emptyState.title')}
      </h3>

      <p className="text-sm text-[#9ba0b5] max-w-md mb-6 leading-relaxed">
        {t('systems.emptyState.description')}
      </p>

      {isAdmin && (
        <button
          onClick={onAddClick}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#d5d5dc] text-[#0d0e15] font-medium text-sm hover:bg-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('systems.emptyState.ctaButton')}</span>
        </button>
      )}
    </div>
  );
};
