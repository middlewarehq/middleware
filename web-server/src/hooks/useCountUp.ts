import { useState, useEffect } from 'react';

const FRAME_DURATION_MS = 16; // Average frame duration for 60fps

export const useCountUp = (
  targetValue: number,
  duration: number = 1500,
  decimalPlaces: number = 0
): number => {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let start = 0;
    const increment = targetValue / (duration / FRAME_DURATION_MS);

    const animateCount = () => {
      start += increment;

      if (start >= targetValue) {
        setCount(parseFloat(targetValue.toFixed(decimalPlaces)));
      } else {
        setCount(parseFloat(start.toFixed(decimalPlaces)));
        requestAnimationFrame(animateCount);
      }
    };

    animateCount();

    return () => {};
  }, [targetValue, duration, decimalPlaces]);

  return count;
};
