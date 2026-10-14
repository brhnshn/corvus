import React, { useEffect, useState, useRef } from 'react';
import { getMotionScale } from '../../lib/motion';

/**
 * Custom hook to smoothly interpolate a numeric value via requestAnimationFrame
 * using a cubic-out deceleration curve: 1 - Math.pow(1 - progress, 3).
 */
export function useAnimatedNumber(
  targetValue: number,
  duration: number = 650,
  decimals: number = 1
): number {
  const [currentValue, setCurrentValue] = useState<number>(targetValue);
  const prevValueRef = useRef<number>(targetValue);

  useEffect(() => {
    // If target value is invalid or reduced motion is preferred, jump directly
    if (typeof window === 'undefined' || isNaN(targetValue)) {
      setCurrentValue(targetValue);
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCurrentValue(targetValue);
      prevValueRef.current = targetValue;
      return;
    }

    const startValue = prevValueRef.current;
    const diff = targetValue - startValue;
    if (Math.abs(diff) < 0.0001) {
      setCurrentValue(targetValue);
      return;
    }

    const scale = getMotionScale();
    const effectiveDuration = duration * scale;
    const startTime = performance.now();
    let animationFrameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / effectiveDuration);
      // Cubic-out curve: 1 - (1 - p)^3
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + diff * easedProgress;

      setCurrentValue(nextValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(tick);
      } else {
        setCurrentValue(targetValue);
        prevValueRef.current = targetValue;
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      prevValueRef.current = targetValue;
    };
  }, [targetValue, duration]);

  // Round to specified decimal places
  const factor = Math.pow(10, decimals);
  return Math.round(currentValue * factor) / factor;
}

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
