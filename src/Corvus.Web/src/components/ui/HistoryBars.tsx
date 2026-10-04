import React from 'react';

export interface HistoryCheck {
  status: 'ok' | 'warn' | 'err';
  latencyMs?: number;
  timestamp?: string;
}

export interface HistoryBarsProps {
  history?: (HistoryCheck | 'ok' | 'warn' | 'err')[];
  count?: number;
  latestLatencyMs?: number;
  className?: string;
}

export const HistoryBars: React.FC<HistoryBarsProps> = ({
  history = [],
  count = 22,
  latestLatencyMs,
  className = '',
}) => {
  // 22 çubukluk dizi hazırla
  const bars = Array.from({ length: count }, (_, i) => {
    const item = history[i];
    if (!item) return 'ok';
    if (typeof item === 'string') return item;
    return item.status;
  });

  return (
    <div className={`flex items-end gap-[3px] h-[22px] select-none ${className}`}>
      {bars.map((status, index) => {
        const bg =
          status === 'err'
            ? 'bg-[#f87171] h-full'
            : status === 'warn'
            ? 'bg-[#fbbf24] h-3/4'
            : 'bg-[#34d399] h-1/2 min-h-[6px]';

        return (
          <i
            key={index}
            className={`flex-1 rounded-[2px] opacity-85 transition-[height,background-color] duration-200 not-italic ${bg}`}
          />
        );
      })}

      {latestLatencyMs !== undefined && (
        <span className="font-mono text-[11px] text-[#9ba0b5] ml-2 shrink-0 whitespace-nowrap">
          {latestLatencyMs} ms
        </span>
      )}
    </div>
  );
};
