import React from 'react';
import { Server, Plus } from 'lucide-react';
import { useI18n } from '../../i18n';

interface ServicesEmptyStateProps {
  onAddClick: () => void;
}

export const ServicesEmptyState: React.FC<ServicesEmptyStateProps> = ({ onAddClick }) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center border border-dashed border-white/15 rounded-2xl p-6 bg-white/[0.02]">
      <Server className="w-12 h-12 text-white/30 mb-3" />
      <h3 className="text-base font-semibold text-white mb-1">{t('services.noServicesFound')}</h3>
      <p className="text-xs text-white/50 max-w-sm mb-4">
        {t('services.noServicesDesc')}
      </p>
      <button
        onClick={onAddClick}
        className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-semibold rounded-xl hover:bg-white/90 transition-all cursor-pointer shadow-sm"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>{t('services.addService')}</span>
      </button>
    </div>
  );
};
