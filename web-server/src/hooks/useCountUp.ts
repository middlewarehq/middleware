import { useState, useEffect } from 'react';

export const useCountUp = (
  targetValue: number,
  duration: number = 1000,
  decimalPlaces: number = 0
): number => {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let start = 0;
    const increment = targetValue / (duration / 16);

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
