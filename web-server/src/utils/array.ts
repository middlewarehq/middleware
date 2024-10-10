import { DatumValue } from '@nivo/line';
import {
  secondsInDay,
  secondsInHour,
  secondsInMinute,
  secondsInMonth,
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
    (_, index) => roundDecimalPlaces(index * s)
  );
  const biggestElement = last(generatedArray);
  if (biggestElement < n) {
    generatedArray.push(roundDecimalPlaces(biggestElement + s));
  }
  return generatedArray;
};

export type TickArrayOptions = {
  wholeNumbers?: boolean;
  isTimeBased?: boolean;
  percentageBased?: boolean;
};

export const createTickArray = (
  data: { x?: DatumValue; y: number }[],
  options: TickArrayOptions = {}
) => {
  const n: number = data.reduce((acc, cur) => (acc > cur.y ? acc : cur.y), 0);
  let step = 1;

  if (options.isTimeBased && n > 10) step = getTimeBasedStep(n);
  else if (options.percentageBased && n > 67) step = getStep(n, true);
  else if (n > 2 || options.wholeNumbers) step = getStep(n);
  else step = getSmallStep(n);

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

const getSmallStep = (n: number) => {
  const ballPark = n / 3; // get roughly around 3-5 steps
  const readableIntervals = [0.01, 0.05, 0.1, 0.2, 0.25, 0.5];
  readableIntervals.sort(
    (x, y) => Math.abs(ballPark - x) - Math.abs(ballPark - y)
  );
  return readableIntervals[0];
};

const getStep = (n: number, percentageBased: boolean = false) => {
  const ballPark = n / 3; // get roughly around 3-5 steps
  let a, twos;
  a = twos = 2;

  let b, fives;
  b = fives = 5;

  let c, tens;
  c = tens = 10;

  let d, twentyFives;
  d = twentyFives = 5;

  while (a <= ballPark) {
    twos = a;
    a *= 10;
  }
  while (b <= ballPark) {
    fives = b;
    b *= 10;
  }
  while (c <= ballPark) {
    tens = c;
    c *= 10;
  }
  while (d <= ballPark) {
    twentyFives = d;
    d *= 5;
  }
  const readableIntervals = [
    1,
    a,
    b,
    c,
    twos,
    fives,
    tens,
    15,
    twentyFives,
    30,
    250
  ].filter((val) => {
    if (!percentageBased) return true;
    if (n > 67) return 100 % val === 0;
    return true;
  });

  readableIntervals.sort(
    (x, y) => Math.abs(ballPark - x) - Math.abs(ballPark - y)
  );

  return readableIntervals[0];
};

const readableTimeIntervals = [
  10,
  15,
  20,
  30,
  secondsInMinute,
  2 * secondsInMinute,
  5 * secondsInMinute,
  10 * secondsInMinute,
  15 * secondsInMinute,
  20 * secondsInMinute,
  30 * secondsInMinute,
  45 * secondsInMinute,
  secondsInHour,
  2 * secondsInHour,
  3 * secondsInHour,
  4 * secondsInHour,
  6 * secondsInHour,
  8 * secondsInHour,
  12 * secondsInHour,
  secondsInDay,
  2 * secondsInDay,
  3 * secondsInDay,
  4 * secondsInDay,
  5 * secondsInDay,
  6 * secondsInDay,
  7 * secondsInDay,
  secondsInWeek,
  2 * secondsInWeek,
  3 * secondsInWeek,
  secondsInMonth
];

const getTimeBasedStep = (n: number) => {
  const ballPark = n / 3; // get roughly around 3-5 steps

  let i = 0;
  let j = 1;

  while (readableTimeIntervals[j] <= ballPark) {
    i = j;
    j++;
  }

  const [a, b] = [
    Math.abs(ballPark - readableTimeIntervals[i]),
    Math.abs(ballPark - readableTimeIntervals[j])
  ];

  return a < b ? readableTimeIntervals[i] : readableTimeIntervals[j];
};
