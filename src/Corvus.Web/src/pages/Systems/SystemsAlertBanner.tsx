import React from 'react';
import { AlertTriangle, ChevronRight, X } from 'lucide-react';
import { useI18n } from '../../i18n';

interface SystemsAlertBannerProps {
  systemName: string;
  metricName: string;
  conditionText: string;
  onDismiss?: () => void;
  onViewAlerts?: () => void;
}

export const SystemsAlertBanner: React.FC<SystemsAlertBannerProps> = ({
  systemName,
  metricName,
  conditionText,
  onDismiss,
  onViewAlerts
}) => {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-950/20 px-4 py-3 text-red-200 flex items-center justify-between gap-4 transition-all animate-fade-in shadow-xs">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-xl bg-red-500/10 text-red-400 shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-red-300 truncate">
            {systemName} · {metricName}
          </div>
          <div className="text-[11px] text-red-400/80 font-mono mt-0.5 truncate">
            {conditionText}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onViewAlerts && (
          <button
            type="button"
            onClick={onViewAlerts}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-200 transition-colors cursor-pointer"
          >
            <span>{t('systems.alert.viewAlerts')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-red-400/60 hover:text-red-200 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
