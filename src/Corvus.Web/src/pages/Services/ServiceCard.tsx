import React from 'react';
import { Server, ShieldCheck, ShieldAlert, ArrowUp, ArrowDown, ExternalLink, Trash2, Pencil } from 'lucide-react';
import type { Service } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { formatServiceUrl } from '../../utils/url';
import { useI18n } from '../../i18n';

interface ServiceCardProps {
  service: Service;
  globalIndex: number;
  totalServices: number;
  isDragging: boolean;
  reordering: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onMove: (currentIndex: number, direction: 'up' | 'down') => void;
  onDelete: (id: string, name: string) => void;
  onEdit: (service: Service) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  globalIndex,
  totalServices,
  isDragging,
  reordering,
  onDragStart,
  onDragEnd,
  onMove,
  onDelete,
  onEdit
}) => {
  const { t } = useI18n();

  return (
    <div
      draggable={true}
      onDragStart={(e) => onDragStart(e, service.id)}
      onDragEnd={onDragEnd}
      className={`p-5 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] hover:border-[#3f4458] hover:bg-[#1e2130] transition-all flex flex-col justify-between group cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-30 scale-95 border-indigo-500/50 shadow-inner' : ''
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0f1117] border border-[#2a2e3f] flex items-center justify-center text-[#d4d4d8] shrink-0 font-bold text-xs">
              {service.icon ? (
                <span className="text-sm">{service.icon}</span>
              ) : (
                <Server className="w-4 h-4 text-[#9ca3af]" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#e5e7eb] group-hover:text-white flex items-center gap-1.5">
                {service.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-[#9ca3af] font-mono uppercase">
                  {service.source}
                </span>
                {service.checkType === 'tcp' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-mono">
                    TCP {service.port ? `:${service.port}` : ''}
                  </span>
                )}
                {service.checkType === 'ping' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono">
                    ICMP PING
                  </span>
                )}
              </div>
            </div>
          </div>
          <StatusBadge status={service.status} />
        </div>

        {service.description && (
          <p className="text-xs text-[#9ca3af] line-clamp-2 mt-2">
            {service.description}
          </p>
        )}

        {/* SSL Expiry Rozeti */}
        {service.sslExpiryDays !== null && service.sslExpiryDays !== undefined && (
          <div className="mt-2">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                service.sslExpiryDays <= 7
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-semibold animate-pulse shadow-xs shadow-rose-950'
                  : service.sslExpiryDays <= 14
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-medium'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
              title={`Sertifika Sağlayıcı: ${service.sslIssuer || 'Bilinmiyor'}`}
            >
              {service.sslExpiryDays <= 14 ? (
                <ShieldAlert className="w-3 h-3 shrink-0" />
              ) : (
                <ShieldCheck className="w-3 h-3 shrink-0" />
              )}
              <span>
                {t('services.sslRemaining', { days: service.sslExpiryDays })}
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[#2a2e3f] pt-4 mt-4">
        {/* Sıralama Butonları (Yukarı / Aşağı) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(globalIndex, 'up')}
            disabled={globalIndex === 0 || reordering}
            className="p-1.5 rounded-lg bg-[#0f1117] border border-[#2a2e3f] text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1a1d29] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Yukarı Taşı"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onMove(globalIndex, 'down')}
            disabled={globalIndex === totalServices - 1 || reordering}
            className="p-1.5 rounded-lg bg-[#0f1117] border border-[#2a2e3f] text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1a1d29] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Aşağı Taşı"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {service.url && (
            <a
              href={formatServiceUrl(service.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#9ca3af] hover:text-[#e5e7eb] font-medium py-1 px-2 rounded-lg bg-[#0f1117] border border-[#2a2e3f] hover:border-[#3b4252] transition-colors"
            >
              <span>{t('dashboard.quickLaunch')}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          <button
            onClick={() => onEdit(service)}
            className="p-1.5 text-[#9ca3af] hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
            title={t('common.edit')}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(service.id, service.name)}
            className="p-1.5 text-[#9ca3af] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
            title={t('common.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
