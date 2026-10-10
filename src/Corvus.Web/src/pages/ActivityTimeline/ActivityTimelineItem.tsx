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
    <div className="flex items-start gap-3.5 p-4 rounded-xl bg-[#1b1d2a] border border-white/10 hover:border-white/20 transition-all">
      <div className="p-2 rounded-lg bg-white/[0.04] border border-white/10 shrink-0 mt-0.5">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-[#eceef6]">
              {entry.targetResource}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${getActionBadgeColor()}`}>
              {entry.actionType}
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#9ba0b5]">
            {formattedDate}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#9ba0b5]">
          <span>
            Aktör: <strong className="text-white font-mono">{entry.actorUsername}</strong>
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
          <div className="mt-2 p-2 rounded-lg bg-[#0d0e15]/60 border border-white/5 text-[11px] font-mono text-slate-300 break-all">
            {entry.detailsJson}
          </div>
        )}
      </div>
    </div>
  );
};
