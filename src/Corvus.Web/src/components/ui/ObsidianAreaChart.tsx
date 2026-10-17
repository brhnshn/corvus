import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useI18n } from '../../i18n';

export interface ChartDataPoint {
  time: string;
  fullTime?: string;
  value: number;
}

export interface ObsidianAreaChartProps {
  data: ChartDataPoint[];
  color?: string;
  height?: number;
  min?: number;
  max?: number;
  unit?: string;
  valueFormatter?: (val: number, point?: ChartDataPoint) => string;
  emptyMessage?: string;
  ariaLabel?: string;
}

export const ObsidianAreaChart: React.FC<ObsidianAreaChartProps> = ({
  data,
  color = '#34d399',
  height = 200,
  min = 0,
  max,
  unit = '',
  valueFormatter,
  emptyMessage,
  ariaLabel,
}) => {
  const { t } = useI18n();
  const effectiveEmptyMessage = emptyMessage ?? t('metrics.emptyData');
  const effectiveAriaLabel = ariaLabel ?? t('metrics.chartAriaLabel');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // SVG İç koordinat sistemi
  const svgWidth = 560;
  const svgHeight = 160;
  const padLeft = 38;
  const padRight = 14;
  const padTop = 14;
  const padBottom = 26;

  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  // Veri aralığı hesabı
  const computedMax = useMemo(() => {
    if (typeof max === 'number') return max;
    if (data.length === 0) return 100;
    const peak = Math.max(...data.map((d) => (typeof d.value === 'number' && !isNaN(d.value) ? d.value : 0)));
    return peak > 0 ? Math.ceil(peak * 1.15) : 100;
  }, [max, data]);

  const computedMin = min;
  const range = Math.max(1, computedMax - computedMin);

  // Veri noktalarının koordinatlarını hesapla
  const coords = useMemo(() => {
    if (data.length === 0) return [];
    if (data.length === 1) {
      const y = padTop + plotH - ((data[0].value - computedMin) / range) * plotH;
      return [
        { x: padLeft, y },
        { x: padLeft + plotW, y },
      ];
    }

    return data.map((d, i) => {
      const val = typeof d.value === 'number' && !isNaN(d.value) ? d.value : 0;
      const clampedVal = Math.max(computedMin, Math.min(computedMax, val));
      const x = padLeft + (i / (data.length - 1)) * plotW;
      const y = padTop + plotH - ((clampedVal - computedMin) / range) * plotH;
      return { x, y };
    });
  }, [data, computedMin, computedMax, range, padLeft, padTop, plotW, plotH]);

  // SVG Çizgi ve Alan Yolu (Line & Area Path)
  const { linePath, areaPath } = useMemo(() => {
    if (coords.length === 0) return { linePath: '', areaPath: '' };

    let lPath = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      lPath += ` L ${coords[i].x.toFixed(1)} ${coords[i].y.toFixed(1)}`;
    }

    const baselineY = padTop + plotH;
    const aPath = `${lPath} L ${coords[coords.length - 1].x.toFixed(1)} ${baselineY} L ${coords[0].x.toFixed(1)} ${baselineY} Z`;

    return { linePath: lPath, areaPath: aPath };
  }, [coords, padTop, plotH]);

  // Yatay Kılavuz Çizgileri ve Y Eksen Etiketleri (3 grid çizgisi: 100%, 50%, 0%)
  const yTicks = useMemo(() => {
    return [
      { ratio: 1, val: computedMax, y: padTop },
      { ratio: 0.5, val: computedMin + range * 0.5, y: padTop + plotH * 0.5 },
      { ratio: 0, val: computedMin, y: padTop + plotH },
    ];
  }, [computedMax, computedMin, range, padTop, plotH]);

  // X Eksen Etiketleri (en fazla 5 zaman işareti)
  const xTicks = useMemo(() => {
    if (data.length < 2) return [];
    const count = Math.min(5, data.length);
    const step = Math.floor((data.length - 1) / (count - 1));
    const ticks: { text: string; x: number }[] = [];

    for (let i = 0; i < count; i++) {
      const idx = i === count - 1 ? data.length - 1 : i * step;
      if (idx < data.length) {
        ticks.push({
          text: data[idx].time || '',
          x: padLeft + (idx / (data.length - 1)) * plotW,
        });
      }
    }
    return ticks;
  }, [data, padLeft, plotW]);

  // Fareyle gezinme (Crosshair Scrubbing)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || data.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const scaleX = svgWidth / rect.width;
      const svgX = clientX * scaleX;

      const clampedX = Math.max(padLeft, Math.min(padLeft + plotW, svgX));
      const ratio = (clampedX - padLeft) / plotW;
      const index = Math.round(ratio * (data.length - 1));
      setHoverIndex(Math.max(0, Math.min(data.length - 1, index)));
    },
    [data, padLeft, plotW, svgWidth]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  if (data.length === 0) {
    return (
      <div 
        className="w-full flex items-center justify-center border border-dashed border-[var(--border-hairline)] rounded-xl text-xs text-[var(--text-muted)]"
        style={{ height }}
      >
        {effectiveEmptyMessage}
      </div>
    );
  }

  const gradId = `obsidian-chart-grad-${color.replace(/[^a-zA-Z0-9]/g, '')}`;
  const activePoint = hoverIndex !== null && hoverIndex < data.length ? data[hoverIndex] : null;
  const activeCoord = hoverIndex !== null && hoverIndex < coords.length ? coords[hoverIndex] : null;

  const formatDisplay = (val: number, pt?: ChartDataPoint) => {
    if (valueFormatter) return valueFormatter(val, pt);
    return `${val.toFixed(1)}${unit}`;
  };

  return (
    <div className="w-full flex flex-col gap-1.5 select-none" style={{ minHeight: height }}>
      {/* Üst Bilgi Barı (Scrubbing / Canlı Hover Etiketi) */}
      <div className="flex items-center justify-between text-xs font-mono h-5 px-1">
        {activePoint ? (
          <>
            <span className="text-[var(--text-secondary)]">{activePoint.fullTime || activePoint.time}</span>
            <span className="font-semibold" style={{ color }}>
              {formatDisplay(activePoint.value, activePoint)}
            </span>
          </>
        ) : (
          <>
            <span className="text-[var(--text-muted)] text-[11px]">
              {data.length > 0 ? `${data[0].time} — ${data[data.length - 1].time}` : ''}
            </span>
            <span className="text-[var(--text-muted)] text-[11px]">
              {t('metrics.peakValue', { value: formatDisplay(computedMax) })}
            </span>
          </>
        )}
      </div>

      {/* Vektörel SVG Çizim Alanı */}
      <div className="w-full relative flex-1" style={{ height: height - 26 }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          aria-label={effectiveAriaLabel}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Yatay Kılavuz Çizgileri & Y Değerleri */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={padLeft + plotW}
                y2={tick.y}
                stroke="var(--border-hairline)"
                strokeDasharray="3 4"
                strokeWidth="1"
              />
              <text
                x={padLeft - 6}
                y={tick.y + 3.5}
                textAnchor="end"
                className="fill-[var(--text-muted)] font-mono text-[9.5px]"
              >
                {Math.round(tick.val)}{unit}
              </text>
            </g>
          ))}

          {/* Doldurulmuş Alan (Area Gradient) */}
          {areaPath && (
            <path
              d={areaPath}
              fill={`url(#${gradId})`}
              className="transition-opacity duration-300"
            />
          )}

          {/* Ana Çizgi (Stroke Line with Drawing Animation) */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="chart-line-anim"
            />
          )}

          {/* X Eksen Zaman Etiketleri */}
          {xTicks.map((tick, i) => (
            <text
              key={i}
              x={tick.x}
              y={svgHeight - 6}
              textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
              className="fill-[var(--text-muted)] font-mono text-[9.5px]"
            >
              {tick.text}
            </text>
          ))}

          {/* Scrubbing Dikey Çizgisi ve Aktif Nokta */}
          {activeCoord && (
            <g>
              <line
                x1={activeCoord.x}
                y1={padTop}
                x2={activeCoord.x}
                y2={padTop + plotH}
                stroke="var(--cloud-300)"
                strokeDasharray="3 3"
                strokeWidth="1.2"
              />
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="4.5"
                fill="#ffffff"
                stroke={color}
                strokeWidth="2.5"
                className="shadow-sm"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
