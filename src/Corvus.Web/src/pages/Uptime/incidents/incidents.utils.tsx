import { AlertOctagon, Wrench, AlertTriangle, Info } from 'lucide-react';
import type { useI18n } from '../../../i18n';

type TranslateFn = ReturnType<typeof useI18n>['t'];

export const getSeverityStyle = (severity: string) => {
  switch (severity) {
    case 'critical':
      return {
        border: 'border-rose-500/30',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        icon: <AlertOctagon className="w-4 h-4 text-rose-400" />
      };
    case 'maintenance':
      return {
        border: 'border-purple-500/30',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        icon: <Wrench className="w-4 h-4 text-purple-400" />
      };
    case 'warning':
      return {
        border: 'border-amber-500/30',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        icon: <AlertTriangle className="w-4 h-4 text-amber-400" />
      };
    case 'info':
    default:
      return {
        border: 'border-sky-500/30',
        badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        icon: <Info className="w-4 h-4 text-sky-400" />
      };
  }
};

export const getSeverityText = (severity: string, t: TranslateFn) => {
  switch (severity) {
    case 'critical':
      return t('incidents.severities.critical');
    case 'warning':
      return t('incidents.severities.warning');
    case 'maintenance':
      return t('incidents.severities.maintenance');
    case 'info':
    default:
      return t('incidents.severities.info');
  }
};

export const getStatusText = (status: string, t: TranslateFn) => {
  switch (status) {
    case 'investigating':
      return t('incidents.statuses.investigating');
    case 'identified':
      return t('incidents.statuses.identified');
    case 'monitoring':
      return t('incidents.statuses.monitoring');
    case 'resolved':
      return t('incidents.statuses.resolved');
    default:
      return status;
  }
};

export const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
};
