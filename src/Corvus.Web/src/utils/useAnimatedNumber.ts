import { useState, useEffect, useRef } from 'react';
import { getMotionScale } from '../lib/motion';

/**
 * Sayı değişimlerini kademeli yumuşak geçişle (interpolasyon) canlandıran hafif React kancası.
 */
export function useAnimatedNumber(
  targetValue: number,
  duration: number = 650,
  decimals: number = 1
): number {
  const [currentValue, setCurrentValue] = useState<number>(targetValue);
  const prevValueRef = useRef<number>(targetValue);

  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (typeof window === 'undefined' || isNaN(targetValue) || isReducedMotion) {
      prevValueRef.current = targetValue;
      return;
    }

    const startValue = prevValueRef.current;
    const diff = targetValue - startValue;
    if (Math.abs(diff) < 0.0001) {
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
  }, [targetValue, duration, isReducedMotion]);

  if (isReducedMotion || isNaN(targetValue)) {
    const factor = Math.pow(10, decimals);
    return Math.round(targetValue * factor) / factor;
  }

  const factor = Math.pow(10, decimals);
  return Math.round(currentValue * factor) / factor;
}
