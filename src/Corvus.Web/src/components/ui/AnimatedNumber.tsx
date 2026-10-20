import React from 'react';
import { useAnimatedNumber } from '../../utils/useAnimatedNumber';

export interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

/**
 * Tabular odometer component for displaying animated KPI numbers.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 1,
  duration = 650,
  className = '',
}) => {
  const animated = useAnimatedNumber(value, duration, decimals);

  const formatted = decimals > 0 
    ? animated.toFixed(decimals) 
    : Math.round(animated).toString();

  return (
    <span className={`mono inline-block tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
