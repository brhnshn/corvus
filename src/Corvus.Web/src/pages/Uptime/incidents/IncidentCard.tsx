import React from 'react';
import { Pin, Check, Edit3, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../../../i18n';
import type { ServiceIncident } from '../../../types';
import {
  getSeverityStyle,
  getSeverityText,
  getStatusText,
  formatDate,
} from './incidents.utils';

export interface IncidentCardProps {
  incident: ServiceIncident;
  onResolve: (id: string) => void;
  onEdit: (inc: ServiceIncident) => void;
  onDelete: (id: string) => void;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  onResolve,
  onEdit,
  onDelete,
}) => {
  const { t } = useI18n();
  const style = getSeverityStyle(incident.severity);
  const isResolved = incident.status === 'resolved';

  return (
    <div
      className={`p-5 rounded-2xl surface border ${style.border} space-y-3 shadow-sm transition-all`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="p-1.5 rounded-xl bg-white/[0.06] border border-white/10">
            {style.icon}
          </span>
          <h3 className="font-bold text-base text-[#eceef6]">
            {incident.title}
          </h3>
          <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${style.badge}`}>
            {getSeverityText(incident.severity, t)}
          </span>
          <span
            className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
              isResolved
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-white/[0.08] text-[#d5d5dc] border-white/15'
            }`}
          >
            {getStatusText(incident.status, t)}
          </span>
          {incident.isPinned && (
            <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Pin className="w-3 h-3" />
              {t('incidents.pinnedBadge')}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!isResolved && (
            <button
              onClick={() => onResolve(incident.id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
              title={t('incidents.resolve')}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('incidents.resolve')}</span>
            </button>
          )}
          <button
            onClick={() => onEdit(incident)}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[#9ba0b5] hover:text-[#eceef6] transition-colors cursor-pointer"
            title={t('common.edit')}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(incident.id)}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-[#9ba0b5] hover:text-rose-300 transition-colors cursor-pointer"
            title={t('common.delete')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-sm text-[#9ba0b5] leading-relaxed whitespace-pre-line break-words pl-0 sm:pl-10">
        {incident.message}
      </p>

      <div className="flex flex-wrap items-center gap-4 text-xs text-[#9ba0b5] pt-2 border-t border-white/10 pl-0 sm:pl-10">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-[#9ba0b5]" />
          {t('incidents.createdAt')}: {formatDate(incident.createdAt)}
        </span>
        {incident.resolvedAt && (
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('incidents.resolvedAt')}: {formatDate(incident.resolvedAt)}
          </span>
        )}
      </div>
    </div>
  );
};
