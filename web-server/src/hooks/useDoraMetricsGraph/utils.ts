import { secondsInDay, secondsInHour } from 'date-fns/constants';

import { indexify } from '@/utils/datatype';

export const calculateMaxScale = (
  graphData: { id: string; value: number }[]
) => {
  const maxVal = Math.max(...graphData.map((s) => s.value));
  return Math.ceil(maxVal / secondsInDay) * secondsInDay;
};

export const calculateTicks = (maxScale: number) => {
  const days = Math.round(maxScale / secondsInDay);
  const hours = Math.round(maxScale / secondsInHour);
  const inDays = days > 2;
  const inWeeks = days > 7;

  if (inWeeks) {
    const WEEK_FACTOR = calculateWeekFactor(days);
    const ticks = Array.from(
      { length: Math.round(days / WEEK_FACTOR) + 1 },
      indexify
    );
    return ticks.map((tick) => tick * secondsInDay * WEEK_FACTOR);
  } else if (inDays) {
    const ticks = Array.from({ length: days + 1 }, indexify);
    return ticks.map((tick) => tick * secondsInDay);
  }

  // Sub 2 days
  const HOUR_FACTOR = hours >= 24 ? 6 : 3;
  const ticks = Array.from(
    { length: Math.round(hours / HOUR_FACTOR) + 1 },
    indexify
  );
  return ticks.map((tick) => tick * secondsInHour * HOUR_FACTOR);
};

export const calculateWeekFactor = (days: number) => {
  if (days < 12) return 2;
  if (days >= 12 && days < 21) return 3;
  return 7;
};
