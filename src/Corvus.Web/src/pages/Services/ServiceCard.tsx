import React from 'react';
import { Server, ArrowUp, ArrowDown, ExternalLink, Trash2, Pencil } from 'lucide-react';
import type { Service } from '../../types';
import { Pill } from '../../components/ui/Pill';
import { TagChip } from '../../components/ui/TagChip';
import { SslBadge } from '../../components/ui/SslBadge';
import { HistoryBars } from '../../components/ui/HistoryBars';
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
  onSelectTag?: (tag: string) => void;
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
  onEdit,
  onSelectTag,
}) => {
  const { t } = useI18n();

  const statusType: 'ok' | 'warn' | 'err' =
    service.status === 'healthy' ? 'ok' : service.status === 'degraded' ? 'warn' : 'err';

  const statusLabel =
    service.status === 'healthy'
      ? 'Çalışıyor'
      : service.status === 'degraded'
      ? 'Yavaş'
      : service.status === 'down'
      ? 'Erişilemiyor'
      : 'Bilinmiyor';

  return (
    <div
      draggable={true}
      onDragStart={(e) => onDragStart(e, service.id)}
      onDragEnd={onDragEnd}
      className={`
        surface rounded-[22px] p-4 sm:p-5 flex flex-col justify-between gap-3.5 transition-all duration-200 select-none group cursor-grab active:cursor-grabbing hover:bg-white/[0.10]
        ${isDragging ? 'opacity-30 scale-95 border-white/30 shadow-inner' : ''}
      `}
    >
      <div className="space-y-3">
        {/* Üst Kısım: İkon + İsim & URL + Durum Hapı */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[13px] border border-white/10 bg-white/[0.07] flex items-center justify-center text-[#eceef6] shrink-0 font-bold text-sm">
              {service.icon ? (
                <span>{service.icon}</span>
              ) : (
                <Server className="w-5 h-5 text-[#9ba0b5]" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-[#eceef6] truncate leading-snug">
                {service.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[11px] text-[#9ba0b5] truncate">
                <span className="uppercase">{service.source}</span>
                {service.url && (
                  <>
                    <span>·</span>
                    <span className="truncate">{service.url.replace(/^https?:\/\//, '')}</span>
                  </>
                )}
                {service.checkType === 'tcp' && (
                  <span className="text-[#818cf8]">
                    · TCP {service.port ? `:${service.port}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Pill status={statusType} label={statusLabel} />
        </div>

        {service.description && (
          <p className="text-xs text-[#9ba0b5] line-clamp-2 leading-relaxed">
            {service.description}
          </p>
        )}

        {/* Meta Rozetleri: Deterministik Etiketler & SSL */}
        <div className="flex flex-wrap items-center gap-1.5 min-h-[26px]">
          {service.tags?.map((tag) => (
            <TagChip
              key={tag}
              name={tag}
              onClick={onSelectTag ? () => onSelectTag(tag) : undefined}
            />
          ))}

          {service.sslExpiryDays !== null && service.sslExpiryDays !== undefined && (
            <SslBadge daysRemaining={service.sslExpiryDays} />
          )}
        </div>

        {/* 22 Çubukluk Sağlık & Tepki Süresi Geçmişi */}
        <HistoryBars
          count={22}
          history={Array(22).fill(statusType)}
          latestLatencyMs={service.status === 'healthy' ? 42 : service.status === 'degraded' ? 480 : 0}
        />
      </div>

      {/* Alt Aksiyon Çubuğu (Midnight v2 ActionBar) */}
      <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-1">
        {/* Sol: Hızlı Aç Butonu */}
        <div>
          {service.url ? (
            <a
              href={formatServiceUrl(service.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-3 rounded-full border border-white/10 bg-white/[0.08] text-xs font-semibold text-[#eceef6] hover:bg-white/[0.14] inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Aç</span>
              <ExternalLink className="w-3 h-3 text-[#9ba0b5]" />
            </a>
          ) : (
            <div />
          )}
        </div>

        {/* Sağ: Sıralama & Düzenle & Sil */}
        <div className="flex items-center gap-1.5">
          {/* Sıralama */}
          <div className="flex items-center gap-1 mr-1">
            <button
              type="button"
              onClick={() => onMove(globalIndex, 'up')}
              disabled={globalIndex === 0 || reordering}
              className="p-1.5 rounded-full bg-white/[0.06] border border-white/10 text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Yukarı Taşı"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onMove(globalIndex, 'down')}
              disabled={globalIndex === totalServices - 1 || reordering}
              className="p-1.5 rounded-full bg-white/[0.06] border border-white/10 text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Aşağı Taşı"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onEdit(service)}
            className="p-2 rounded-full text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.10] transition-colors cursor-pointer"
            title={t('common.edit')}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(service.id, service.name)}
            className="p-2 rounded-full text-[#9ba0b5] hover:text-[#f87171] hover:bg-rose-500/10 transition-colors cursor-pointer"
            title={t('common.delete')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
