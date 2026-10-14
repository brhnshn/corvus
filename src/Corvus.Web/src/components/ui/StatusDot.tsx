import React from 'react';

export type DotStatus = 'up' | 'warn' | 'down' | 'muted' | 'healthy' | 'degraded' | 'offline';

export interface StatusDotProps {
  status: DotStatus;
  className?: string;
  size?: number;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  className = '',
  size = 6,
}) => {
  const dotClass =
    status === 'up' || status === 'healthy'
      ? 'dot-up'
      : status === 'warn' || status === 'degraded'
      ? 'dot-warn'
      : status === 'down' || status === 'offline'
      ? 'dot-down'
      : 'dot-muted';

  return (
    <span
      className={`dot ${dotClass} ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-hidden="true"
    />
  );
};
