import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { TableWrap } from '../../components/ui/ExpandableTable';
import { StatusDot } from '../../components/ui/StatusDot';
import { activityLogsApi } from '../../api/activityLogs';
import { useI18n } from '../../i18n';
import type { Service, DockerContainer, BackupEvent, ActivityLogEntry } from '../../types';

export interface EventItem {
  id: string;
  status: 'ok' | 'warn' | 'err';
  title: string;
  timeAgo: string;
  category?: string;
}

export interface RecentEventsCardProps {
  services?: Service[];
  containers?: DockerContainer[];
  lastBackup?: BackupEvent;
  liveEvents?: EventItem[];
  onNavigate?: (page: 'activity') => void;
}

export const RecentEventsCard: React.FC<RecentEventsCardProps> = ({
  liveEvents = [],
  onNavigate,
}) => {
  const { t } = useI18n();
  const [dbLogs, setDbLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    activityLogsApi
      .getActivityLogs(1, 5)
      .then((res) => {
        if (active && res && Array.isArray(res.items)) {
          setDbLogs(res.items);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Gerçek veri tabanı kayıtlarını EventItem formatına dönüştür
  const formattedDbEvents: EventItem[] = dbLogs.map((log) => {
    const isErr =
      log.actionType.toLowerCase().includes('fail') ||
      log.actionType.toLowerCase().includes('delete') ||
      log.actionType.toLowerCase().includes('down');
    const isWarn =
      log.actionType.toLowerCase().includes('warn') ||
      log.actionType.toLowerCase().includes('restart');

    const d = new Date(log.createdAt);
    const timeAgo = isNaN(d.getTime())
      ? '-'
      : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      id: log.id,
      status: isErr ? 'err' : isWarn ? 'warn' : 'ok',
      title: `${log.actorUsername || 'system'}: ${log.actionType} (${log.targetResource})`,
      timeAgo,
      category: log.category || 'Audit',
    };
  });

  const allEvents = [...liveEvents, ...formattedDbEvents].slice(0, 5);

  return (
    <Card>
      <CardHeader
        action={
          onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('activity')}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--cloud-100)] transition-colors cursor-pointer"
            >
              {t('common.viewAll') || 'Tümünü Gör'} →
            </button>
          )
        }
      >
        <CardTitle>{t('dashboard.recentEvents') || 'Son Gerçekleşen Olaylar'}</CardTitle>
      </CardHeader>
      <CardContent className="!p-0">
        {loading && allEvents.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--text-muted)] font-mono">
            {t('common.loading') || 'Yükleniyor...'}
          </div>
        ) : allEvents.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--text-muted)]">
            {t('dashboard.noRecentEvents') || 'Kayıtlı sistem olayı bulunmuyor'}
          </div>
        ) : (
          <TableWrap>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>{t('common.time') || 'Zaman'}</th>
                  <th>{t('dashboard.eventDescription') || 'Olay Tanımı'}</th>
                  <th style={{ textAlign: 'right' }}>{t('common.category') || 'Kategori'}</th>
                </tr>
              </thead>
              <tbody>
                {allEvents.map((evt) => {
                  const dotStatus = evt.status === 'ok' ? 'up' : evt.status === 'warn' ? 'warn' : 'down';
                  return (
                    <tr
                      key={evt.id}
                      className="data-row cursor-pointer"
                      onClick={() => onNavigate?.('activity')}
                    >
                      <td className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
                        {evt.timeAgo}
                      </td>
                      <td>
                        <div className="flex items-center gap-2 min-w-0">
                          <StatusDot status={dotStatus} />
                          <span className="text-xs text-[var(--cloud-100)] font-medium truncate max-w-[260px]">
                            {evt.title}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="badge text-[10px]">
                          {evt.category || 'Sistem'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </CardContent>
    </Card>
  );
};
