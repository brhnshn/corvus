import React from 'react';
import { useI18n } from '../../i18n';

export interface UptimeSegment {
  status: 'up' | 'warn' | 'down' | 'muted';
  tooltip?: string;
  latency?: number;
}

export interface UptimeStripProps {
  segments?: UptimeSegment[];
  count?: number;
  height?: number;
  className?: string;
}

/**
 * ObsidianUI Uptime Strip featuring 45-60 micro-segments with
 * dynamic hover-wave scaling (transform: scaleY(1.28)).
 */
export const UptimeStrip: React.FC<UptimeStripProps> = ({
  segments,
  count = 45,
  height = 20,
  className = '',
}) => {
  const { t } = useI18n();
  const displaySegments: UptimeSegment[] =
    segments && segments.length > 0
      ? segments
      : Array.from({ length: count }, (): UptimeSegment => ({ status: 'up' }));

  return (
    <div
      className={`uptime-strip ${className}`}
      style={{ height: `${height}px` }}
      role="meter"
      aria-label={t('uptime.uptimeHistory')}
    >
      {displaySegments.slice(0, count).map((seg, idx) => {
        const statusClass =
          seg.status === 'warn'
            ? 'warn'
            : seg.status === 'down'
            ? 'down'
            : '';

        return (
          <div
            key={idx}
            className={`uptime-seg ${statusClass}`}
            title={seg.tooltip || (seg.latency ? `${seg.latency} ms` : t('uptime.fullyOperational'))}
          />
        );
      })}
    </div>
  );
};
