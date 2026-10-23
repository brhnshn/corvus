import React from 'react';
import { Terminal, RotateCw, Play, Square, Server } from 'lucide-react';
import type { SystemdUnitDto } from '../../types';
import { useI18n } from '../../i18n';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { formatBytes } from '../../utils/format';

interface SystemdUnitRowProps {
  unit: SystemdUnitDto;
  isAdmin: boolean;
  isBusy: boolean;
  onOpenLogs: (unitName: string) => void;
  onRequestConfirm: (unitName: string, action: 'restart' | 'stop') => void;
  onStart: (unitName: string) => void;
}

export const SystemdUnitRow: React.FC<SystemdUnitRowProps> = ({
  unit: u,
  isAdmin,
  isBusy,
  onOpenLogs,
  onRequestConfirm,
  onStart
}) => {
  const { t } = useI18n();

  const isRunning = u.activeState.toLowerCase() === 'active' && u.subState.toLowerCase() === 'running';
  const isFailed = u.activeState.toLowerCase() === 'failed';

  const statusType = isRunning ? 'up' : isFailed ? 'down' : 'muted';

  return (
    <tr
      className="hover:bg-[var(--bg-hover)] transition-colors group"
    >
      {/* Birim Adı */}
      <td className="py-2.5 px-4 font-mono font-medium text-[var(--text-primary)]">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
          <span className="truncate max-w-[220px]" title={u.name}>
            {u.name}
          </span>
        </div>
      </td>

      {/* Açıklama */}
      <td className="py-2.5 px-3 text-[var(--text-secondary)] max-w-xs truncate" title={u.description}>
        {u.description || '-'}
      </td>

      {/* Durum Rozeti */}
      <td className="py-2.5 px-3">
        <StatusBadge status={statusType}>
          {u.activeState}
        </StatusBadge>
      </td>

      {/* Alt Durum */}
      <td className="py-2.5 px-3 font-mono text-[var(--text-muted)]">
        {u.subState || '-'}
      </td>

      {/* Bellek */}
      <td className="py-2.5 px-3 font-mono tabular-nums text-[var(--text-secondary)]">
        {typeof u.memoryBytes === 'number' && u.memoryBytes > 0
          ? formatBytes(u.memoryBytes)
          : '-'}
      </td>

      {/* Aksiyon Butonları */}
      <td className="py-2.5 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          {/* Journalctl Logları */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenLogs(u.name)}
            title={t('services.systemdViewLogs')}
            icon={<Terminal className="w-3.5 h-3.5" />}
          />

          {/* Yeniden Başlat */}
          <Button
            variant="default"
            size="sm"
            onClick={() => onRequestConfirm(u.name, 'restart')}
            disabled={!isAdmin || isBusy}
            isLoading={isBusy}
            title={!isAdmin ? t('services.systemdViewerDisabled') : t('services.systemdRestart')}
            icon={<RotateCw className="w-3.5 h-3.5" />}
          />

          {/* Durdur / Başlat */}
          {isRunning ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onRequestConfirm(u.name, 'stop')}
              disabled={!isAdmin || isBusy}
              title={!isAdmin ? t('services.systemdViewerDisabled') : t('services.systemdStop')}
              icon={<Square className="w-3 h-3" />}
            />
          ) : (
            <Button
              variant="cloud"
              size="sm"
              onClick={() => onStart(u.name)}
              disabled={!isAdmin || isBusy}
              title={!isAdmin ? t('services.systemdViewerDisabled') : t('services.systemdStart')}
              icon={<Play className="w-3 h-3" />}
            />
          )}
        </div>
      </td>
    </tr>
  );
};
