import React from 'react';
import { 
  Play, 
  RotateCw, 
  Square, 
  AlertTriangle, 
  Shield, 
  Layers, 
  Activity, 
  Clock,
  Terminal
} from 'lucide-react';
import type { ActivityLogEntry } from '../../types';

interface ActivityTimelineItemProps {
  entry: ActivityLogEntry;
}

export const ActivityTimelineItem: React.FC<ActivityTimelineItemProps> = ({ entry }) => {
  const getIcon = () => {
    switch (entry.category) {
      case 'container':
        if (entry.actionType.includes('start')) return <Play className="w-4 h-4 text-emerald-400" />;
        if (entry.actionType.includes('stop')) return <Square className="w-4 h-4 text-red-400" />;
        if (entry.actionType.includes('restart')) return <RotateCw className="w-4 h-4 text-indigo-400" />;
        if (entry.actionType.includes('terminal')) return <Terminal className="w-4 h-4 text-cyan-400" />;
        return <Layers className="w-4 h-4 text-indigo-400" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'security':
        return <Shield className="w-4 h-4 text-emerald-400" />;
      case 'uptime':
        return <Clock className="w-4 h-4 text-cyan-400" />;
      default:
        return <Activity className="w-4 h-4 text-[#9ba0b5]" />;
    }
  };

  const getActionBadgeColor = () => {
    if (entry.actionType.includes('alert') || entry.actionType.includes('crash')) {
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
    if (entry.actionType.includes('start') || entry.actionType.includes('resolved') || entry.actionType.includes('heal')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    return 'bg-white/5 text-[#9ba0b5] border-white/10';
  };

  const formattedDate = new Date(entry.createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="flex items-start gap-3.5 p-3.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border-hairline)] hover:border-[var(--cloud-400)] transition-all">
      <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] shrink-0 mt-0.5">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-[var(--cloud-100)] font-mono">
              {entry.targetResource}
            </span>
            <span className={`badge ${getActionBadgeColor()}`}>
              {entry.actionType}
            </span>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            {formattedDate}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-secondary)]">
          <span>
            Aktör: <strong className="text-[var(--cloud-100)] font-mono">{entry.actorUsername}</strong>
          </span>
          <span>•</span>
          <span>Kategori: {entry.category}</span>
          {entry.ipAddress && (
            <>
              <span>•</span>
              <span className="font-mono">IP: {entry.ipAddress}</span>
            </>
          )}
        </div>

        {entry.detailsJson && (
          <div className="mt-2 p-2 rounded-[var(--radius-sm)] bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[11px] font-mono text-[var(--cloud-300)] break-all">
            {entry.detailsJson}
          </div>
        )}
      </div>
    </div>
  );
};
