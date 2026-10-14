import React, { useEffect, useState } from 'react';

export interface AnimatedBarProps {
  percentage: number;
  color?: string;
  height?: number | string;
  className?: string;
  trackColor?: string;
}

/**
 * 4px slim progress bar that animates from 0% to target percentage
 * using ObsidianUI --dur-chart and --ease-spring transition.
 */
export const AnimatedBar: React.FC<AnimatedBarProps> = ({
  percentage,
  color = 'var(--cloud-200)',
  height = 4,
  className = '',
  trackColor,
}) => {
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage));
    const rAf = requestAnimationFrame(() => {
      setWidth(clamped);
    });
    return () => cancelAnimationFrame(rAf);
  }, [percentage]);

  return (
    <div
      className={`bar-track ${className}`}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        ...(trackColor ? { backgroundColor: trackColor } : {}),
      }}
    >
      <div
        className="bar-fill"
        style={{
          width: `${width}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
};
