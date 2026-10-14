import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { TableWrap } from '../../components/ui/ExpandableTable';
import { StatusDot } from '../../components/ui/StatusDot';
import type { Service, DockerContainer, BackupEvent } from '../../types';

export interface EventItem {
  id: string;
  status: 'ok' | 'warn' | 'err';
  title: string;
  timeAgo: string;
  category?: string;
}

export interface RecentEventsCardProps {
  services: Service[];
  containers: DockerContainer[];
  lastBackup?: BackupEvent;
  liveEvents?: EventItem[];
  onNavigate?: (page: 'activity') => void;
}

export const RecentEventsCard: React.FC<RecentEventsCardProps> = ({
  services,
  containers,
  lastBackup,
  liveEvents = [],
  onNavigate,
}) => {
  // Canlı verilerden son 24 saatlik durum olayları türet
  const generatedEvents: EventItem[] = [];

  // Konteyner durumları
  containers.slice(0, 3).forEach((c) => {
    const cleanName = (c.Names?.[0] || c.Id).replace(/^\//, '');
    const isRunning = c.State.toLowerCase() === 'running';
    generatedEvents.push({
      id: `cnt-${c.Id}`,
      status: isRunning ? 'ok' : 'err',
      title: `${cleanName} ${isRunning ? 'çalışıyor' : 'durdu'}`,
      timeAgo: c.Status || 'az önce',
      category: 'Konteyner',
    });
  });

  // SSL süresi uyarısı
  services
    .filter((s) => typeof s.sslExpiryDays === 'number' && s.sslExpiryDays <= 30 && s.sslExpiryDays >= 0)
    .slice(0, 2)
    .forEach((s) => {
      generatedEvents.push({
        id: `ssl-${s.id}`,
        status: s.sslExpiryDays! < 7 ? 'err' : 'warn',
        title: `${s.name} SSL sertifikası yakında dolacak`,
        timeAgo: `${s.sslExpiryDays} gün kaldı`,
        category: 'Güvenlik',
      });
    });

  // Yedekleme olayı
  if (lastBackup) {
    generatedEvents.push({
      id: `backup-${lastBackup.id}`,
      status: lastBackup.status === 'success' ? 'ok' : 'err',
      title: `Sistem yedeklemesi ${lastBackup.status === 'success' ? 'başarılı' : 'başarısız'}`,
      timeAgo: new Date(lastBackup.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'Yedek',
    });
  }

  // Birleştirilmiş olay listesi
  const allEvents = [...liveEvents, ...generatedEvents].slice(0, 5);

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
              Tüm Geçmiş →
            </button>
          )
        }
      >
        <CardTitle>Son Gerçekleşen Olaylar</CardTitle>
      </CardHeader>
      <CardContent className="!p-0">
        {allEvents.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--text-muted)]">
            Kayıtlı sistem olayı bulunmuyor
          </div>
        ) : (
          <TableWrap>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Zaman</th>
                  <th>Olay Tanımı</th>
                  <th style={{ textAlign: 'right' }}>Kategori</th>
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
                        <div className="flex items-center gap-2">
                          <StatusDot status={dotStatus} />
                          <span className="text-xs text-[var(--cloud-100)] font-medium truncate max-w-[220px]">
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

