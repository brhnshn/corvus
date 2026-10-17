import React from 'react';
import { Server, ArrowUp, ArrowDown, ExternalLink, Trash2, Pencil } from 'lucide-react';
import type { Service } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { StatusDot } from '../../components/ui/StatusDot';
import { TagChip } from '../../components/ui/TagChip';
import { SslBadge } from '../../components/ui/SslBadge';
import { formatServiceUrl } from '../../utils/url';
import { useI18n } from '../../i18n';

interface ServiceCardProps {
  service: Service;
  globalIndex: number;
  totalServices: number;
  isDragging: boolean;
  reordering: boolean;
  isAdmin?: boolean;
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
  isAdmin = true,
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
  const dotStatus = statusType === 'ok' ? 'up' : statusType === 'warn' ? 'warn' : 'down';

  const statusLabel =
    service.status === 'healthy'
      ? t('services.statusHealthy')
      : service.status === 'degraded'
      ? t('services.statusDegraded')
      : service.status === 'down'
      ? t('services.statusDown')
      : t('services.statusUnknown');

  return (
    <div
      draggable={true}
      onDragStart={(e) => onDragStart(e, service.id)}
      onDragEnd={onDragEnd}
      className={`
        card p-4 flex flex-col justify-between gap-3.5 transition-all select-none group cursor-grab active:cursor-grabbing hover:border-[var(--border-strong)]
        ${isDragging ? 'opacity-30 scale-95 border-[var(--border-strong)]' : ''}
      `}
    >
      <div className="space-y-3">
        {/* Üst Kısım: İkon + İsim & URL + Durum Rozeti */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--cloud-200)] shrink-0 font-bold text-sm">
              {service.icon ? (
                <span>{service.icon}</span>
              ) : (
                <Server className="w-4 h-4 text-[var(--text-muted)]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <StatusDot status={dotStatus} />
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] truncate leading-snug">
                  {service.name}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[11px] text-[var(--text-muted)] truncate">
                <span className="uppercase">{service.source}</span>
                {service.url && (
                  <>
                    <span>·</span>
                    <span className="truncate">{service.url.replace(/^https?:\/\//, '')}</span>
                  </>
                )}
                {service.checkType === 'tcp' && (
                  <span className="text-[var(--text-secondary)]">
                    · TCP {service.port ? `:${service.port}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <StatusBadge status={dotStatus}>
            {statusLabel}
          </StatusBadge>
        </div>

        {service.description && (
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
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
      </div>

      {/* Alt Aksiyon Çubuğu */}
      <div className="flex items-center justify-between border-t border-[var(--border-hairline)] pt-3 mt-1">
        {/* Sol: Hızlı Aç Butonu */}
        <div>
          {service.url ? (
            <a
              href={formatServiceUrl(service.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-ghost inline-flex items-center gap-1.5"
            >
              <span>{t('common.open')}</span>
              <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
            </a>
          ) : (
            <div />
          )}
        </div>

        {/* Sağ: Sıralama & Düzenle & Sil */}
        {isAdmin && (
          <div className="flex items-center gap-1">
            {/* Sıralama */}
            <div className="flex items-center gap-0.5 mr-1">
              <button
                type="button"
                onClick={() => onMove(globalIndex, 'up')}
                disabled={globalIndex === 0 || reordering}
                className="btn btn-sm btn-ghost p-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                title={t('services.moveUp')}
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onMove(globalIndex, 'down')}
                disabled={globalIndex === totalServices - 1 || reordering}
                className="btn btn-sm btn-ghost p-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                title={t('services.moveDown')}
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onEdit(service)}
              className="btn btn-sm btn-ghost p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title={t('common.edit')}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onDelete(service.id, service.name)}
              className="btn btn-sm btn-ghost p-1.5 text-[var(--text-muted)] hover:text-[var(--status-down)]"
              title={t('common.delete')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
