import { useState, useEffect } from 'react';

const STEPS = 7; // number of steps to reach the target value
const INTERVAL = 75; // in ms

export const useCountUp = (
  targetValue: number,
  decimalPlaces: number = 0
): number => {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let currentStep = 0;
    const stepValue = targetValue / STEPS;

    const timer = setInterval(() => {
      currentStep++;

      if (currentStep >= STEPS) {
        setCount(parseFloat(targetValue.toFixed(decimalPlaces)));
        clearInterval(timer);
      } else {
        const newValue = stepValue * currentStep;
        setCount(parseFloat(newValue.toFixed(decimalPlaces)));
      }
    }, INTERVAL);

    return () => clearInterval(timer);
  }, [targetValue, decimalPlaces]);

  return count;
};
