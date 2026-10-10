import { useState, useEffect, useRef } from 'react';

/**
 * Sayı değişimlerini kademeli yumuşak geçişle (interpolasyon) canlandıran hafif React kancası.
 */
export function useAnimatedNumber(targetValue: number, durationMs: number = 400): number {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // prefers-reduced-motion kontrolü
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(targetValue);
      return;
    }

    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / durationMs, 1);
      
      // ease-out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValueRef.current + (targetValue - startValueRef.current) * easeProgress;
      
      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [targetValue, durationMs]);

  return displayValue;
}
