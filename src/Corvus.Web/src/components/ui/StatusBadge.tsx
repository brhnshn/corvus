import React from 'react';
import { StatusDot, type DotStatus } from './StatusDot';

export interface StatusBadgeProps {
  status: DotStatus;
  children: React.ReactNode;
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  showDot = true,
  className = '',
}) => {
  const badgeClass =
    status === 'up' || status === 'healthy'
      ? 'badge-up'
      : status === 'warn' || status === 'degraded'
      ? 'badge-warn'
      : status === 'down' || status === 'offline'
      ? 'badge-down'
      : '';

  return (
    <span className={`badge ${badgeClass} ${className}`}>
      {showDot && <StatusDot status={status} size={6} />}
      <span>{children}</span>
    </span>
  );
};
