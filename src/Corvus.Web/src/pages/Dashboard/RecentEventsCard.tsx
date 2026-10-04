import React from 'react';
import type { Service, DockerContainer, BackupEvent } from '../../types';

export interface EventItem {
  id: string;
  status: 'ok' | 'warn' | 'err';
  title: string;
  timeAgo: string;
}

export interface RecentEventsCardProps {
  services: Service[];
  containers: DockerContainer[];
  lastBackup?: BackupEvent;
  liveEvents?: EventItem[];
}

export const RecentEventsCard: React.FC<RecentEventsCardProps> = ({
  services,
  containers,
  lastBackup,
  liveEvents = [],
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
        title: `${s.name} SSL sertifikası ${s.sslExpiryDays} gün içinde dolacak`,
        timeAgo: 'aktif uyarı',
      });
    });

  // Yedekleme olayı
  if (lastBackup) {
    generatedEvents.push({
      id: `backup-${lastBackup.id}`,
      status: lastBackup.status === 'success' ? 'ok' : 'err',
      title: `Sistem yedeklemesi ${lastBackup.status === 'success' ? 'tamamlandı' : 'başarısız oldu'}`,
      timeAgo: new Date(lastBackup.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  }

  // Birleştirilmiş olay listesi
  const allEvents = [...liveEvents, ...generatedEvents].slice(0, 5);

  const dotColors = {
    ok: 'bg-[#34d399] shadow-[0_0_0_4px_rgba(52,211,153,0.18)]',
    warn: 'bg-[#fbbf24] shadow-[0_0_0_4px_rgba(251,191,36,0.18)]',
    err: 'bg-[#f87171] shadow-[0_0_0_4px_rgba(248,113,113,0.18)]',
  };

  return (
    <section className="surface rounded-[22px] p-4 sm:p-5 flex flex-col justify-between animate-rv" style={{ animationDelay: '280ms' }}>
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <b className="text-base font-semibold text-[#eceef6] block leading-snug">
            Son Olaylar
          </b>
          <small className="font-mono text-xs text-[#9ba0b5]">
            son 24 saat
          </small>
        </div>
      </div>

      {allEvents.length === 0 ? (
        <div className="text-center py-6 text-xs text-[#9ba0b5]">
          Kayıtlı sistem olayı bulunmuyor
        </div>
      ) : (
        <ul className="space-y-3.5 list-none">
          {allEvents.map((evt) => (
            <li key={evt.id} className="flex items-start gap-3 text-[13px] leading-snug">
              <span
                className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${dotColors[evt.status]}`}
              />
              <div className="min-w-0 flex-1">
                <span className="text-[#eceef6] font-medium block truncate">
                  {evt.title}
                </span>
                <small className="font-mono text-[11px] text-[#9ba0b5] block mt-0.5">
                  {evt.timeAgo}
                </small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
