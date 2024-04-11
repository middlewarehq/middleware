import { percent } from './datatype';

/**
 * Calculate the trendline from a given numeric array
 * @param series list of numbers
 * @returns slope, intercept --- `y = mx + c`, where m = slope, c = intercept
 */
export function trend(series: number[]) {
  const n = series.length;
  if (n < 2)
    return {
      slope: 0,
      intercept: series[0] || 0,
      change: 0,
      trendline: [series[0] || 0]
    };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += series[i];
    sumXY += i * series[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const m = slope;
  const c = intercept;

  const trendline = series.map((_, x) => m * x + c);
  const change = percent(trendline.at(-1), trendline[0]) - 100;

  return { slope, intercept, trendline, change };
}

export function generateRandomNumbersWithExactAverageAndRange(
  min: number,
  max: number,
  targetedAverage: number,
  count: number,
  sortDescending: boolean
): number[] {
  // Validate input
  if (
    typeof min !== 'number' ||
    min < 0 ||
    typeof max !== 'number' ||
    max <= min ||
    typeof targetedAverage !== 'number' ||
    targetedAverage < min ||
    targetedAverage > max ||
    typeof count !== 'number' ||
    count <= 0
  ) {
    return Array(count).fill(0);
  }

  // Generate (n-1) random numbers within the specified range
  const numbers: number[] = [];
  while (numbers.length < count - 1) {
    const randomNum = Math.random() * (max - min) + min;
    const roundedNum = parseFloat(randomNum.toFixed(2)); // Round to 2 decimal places

    if (!numbers.includes(roundedNum)) {
      numbers.push(roundedNum);
    }
  }

  // Calculate the nth number to make the average exactly equal to the specified range
  const sumOfGeneratedNumbers = numbers.reduce((sum, num) => sum + num, 0);
  const nthNumber = targetedAverage * count - sumOfGeneratedNumbers;

  // Ensure the nthNumber is within the specified range
  const validNthNumber = Math.min(Math.max(nthNumber, min), max);

  numbers.push(parseFloat(validNthNumber.toFixed(2))); // Round to 2 decimal places
  numbers.sort((a, b) => (sortDescending ? b - a : a - b));

  return numbers;
}
