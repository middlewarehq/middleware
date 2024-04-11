import { DatumValue } from '@nivo/line';
import {
  secondsInDay,
  secondsInHour,
  secondsInMinute,
  secondsInWeek
} from 'date-fns/constants';
import { last } from 'ramda';

import { DateValueTuple } from '@/types/resources';

export function mergeArrays<T>(...arrays: (T[] | undefined)[]): T[] {
  // Filter out undefined arrays and concatenate the rest
  return arrays
    .filter((array) => Array.isArray(array))
    .reduce(
      (mergedArray, currentArray) => mergedArray.concat(currentArray),
      []
    );
}

export const generateArrayWithSteps = (n: number, s: number) => {
  if (!s) {
    return [];
  }
  const generatedArray = Array.from(
    { length: Math.floor(n / s) + 1 },
    (_, index) => Number((index * s).toFixed(0))
  );
  const biggestElement = last(generatedArray);
  if (biggestElement < n) {
    generatedArray.push(Number((biggestElement + s).toFixed(0)));
  }
  return generatedArray;
};

export type TickArrayOptions = {
  wholeNumbers?: boolean;
  isTimeBased?: boolean;
};

export const createTickArray = (
  data: { x?: DatumValue; y: number }[],
  options: TickArrayOptions = {}
) => {
  const n: number =
    data.reduce((acc, cur) => (acc > cur.y ? acc : cur.y), 0) + 1;
  let step = 1;

  if (options.isTimeBased && n > 10) {
    {
      if (n < 20) {
        step = 2;
      } else if (n < 30) {
        step = 5;
      } else if (n < secondsInMinute) {
        step = 10;
      } else if (n < 2 * secondsInMinute) {
        step = 15;
      } else if (n < 5 * secondsInMinute) {
        step = 30;
      } else if (n < 10 * secondsInMinute) {
        step = secondsInMinute;
      } else if (n < 20 * secondsInMinute) {
        step = 2 * secondsInMinute;
      } else if (n < 30 * secondsInMinute) {
        step = 5 * secondsInMinute;
      } else if (n < secondsInHour) {
        step = 10 * secondsInMinute;
      } else if (n < 2 * secondsInHour) {
        step = 15 * secondsInMinute;
      } else if (n < 5 * secondsInHour) {
        step = 30 * secondsInMinute;
      } else if (n < 10 * secondsInHour) {
        step = secondsInHour;
      } else if (n < 20 * secondsInHour) {
        step = 2 * secondsInHour;
      } else if (n < secondsInDay) {
        step = 4 * secondsInHour;
      } else if (n < 2 * secondsInDay) {
        step = 6 * secondsInHour;
      } else if (n < 3 * secondsInDay) {
        step = 8 * secondsInHour;
      } else if (n < secondsInWeek) {
        step = secondsInDay;
      } else if (n < 2 * secondsInWeek) {
        step = 2 * secondsInDay;
      } else if (n < 3 * secondsInWeek) {
        step = 3 * secondsInDay;
      } else {
        step = secondsInWeek;
      }
      return generateArrayWithSteps(n, step);
    }
  }
  const numberOfDigits = Math.round(n).toString().length;
  const order = Math.pow(10, numberOfDigits - 1);

  const twoStep = order * 2; // steps of 2, 20, 200...
  const fiveStep = order * 5; // steps of 5, 50, 500...
  const tenStep = order * 10; // steps of 10, 100, 1000...
  if (n < twoStep) step = twoStep / 10;
  else if (n < fiveStep) step = fiveStep / 10;
  else if (n < tenStep) step = tenStep / 10;

  if (options.wholeNumbers) step = Math.ceil(step);

  return generateArrayWithSteps(n, step);
};
export function mergeDateValueTupleArray<T extends DateValueTuple>(
  ...arrays: (T[] | undefined)[]
): T[] {
  const arraysAsObjects = arrays
    .filter((array) => Array.isArray(array))
    .map((array) => Object.fromEntries(array));
  const mergedDateValueMap: Record<string, number> = Object.assign(
    {},
    ...arraysAsObjects
  );
  return Object.entries(mergedDateValueMap) as T[];
}

export const roundDecimalPlaces = (
  value: number,
  roundingDigits: number = 2
) => {
  return Number(value?.toFixed(roundingDigits));
};
