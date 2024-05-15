import {
  previousMonday,
  subDays,
  nextFriday,
  endOfDay,
  isMonday,
  subWeeks,
  addWeeks,
  startOfDay,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  getQuarter,
  getYear,
  differenceInDays,
  endOfMonth,
  startOfMonth,
  subMonths,
  format,
  min
} from 'date-fns';

import { DateRange } from './index';

const midnight = startOfDay;
const d = () => new Date();
/**
 * Gets a date range for the last N working weeks,
 * where a working week is a range from Monday to Friday
 * @param count how many weeks in the past to get a range for
 * @returns DateRange
 */

export const getLastNWeeksRange = (count: number = 1): DateRange => {
  const date = midnight(d());

  const start = previousMonday(subWeeks(date, count));

  const end = addWeeks(nextFriday(start), count - 1);

  return [start, endOfDay(end)];
};
/**
 * Gets a date range of the current working week, starting at the last monday
 * even if today is a monday, and ending at the upcoming friday
 * (which is of course in the future)
 * @returns DateRange
 */

export const getCurrentWeekRange = (): DateRange => {
  const date = midnight(d());

  const start = isMonday(date) ? date : previousMonday(date);
  const end = Math.min(date.getTime(), nextFriday(start).getTime());

  return [start, endOfDay(end)];
};

export const DateRangeLogic = {
  yesterday: () =>
    [midnight(subDays(d(), 1)), endOfDay(subDays(d(), 1))] as DateRange,
  oneWeek: () => [midnight(subDays(d(), 7 - 1)), endOfDay(d())] as DateRange,
  twoWeeks: () => [midnight(subDays(d(), 14 - 1)), endOfDay(d())] as DateRange,
  oneMonth: () => [midnight(subDays(d(), 30 - 1)), endOfDay(d())] as DateRange,
  threeMonths: () =>
    [midnight(subDays(d(), 90 - 1)), endOfDay(d())] as DateRange,
  currMonth: () =>
    [startOfMonth(d()), min([endOfDay(d()), endOfMonth(d())])] as DateRange,
  minus1Month: () =>
    [
      startOfMonth(subMonths(d(), 1)),
      endOfMonth(subMonths(d(), 1))
    ] as DateRange,
  minus2Month: () =>
    [
      startOfMonth(subMonths(d(), 2)),
      endOfMonth(subMonths(d(), 2))
    ] as DateRange,
  currQtr: () => [startOfQuarter(d()), endOfQuarter(d())] as DateRange,
  minus1Qtr: () =>
    [
      startOfQuarter(subQuarters(d(), 1)),
      endOfQuarter(subQuarters(d(), 1))
    ] as DateRange,
  minus2Qtr: () =>
    [
      startOfQuarter(subQuarters(d(), 2)),
      endOfQuarter(subQuarters(d(), 2))
    ] as DateRange,
  minus3Qtr: () =>
    [
      startOfQuarter(subQuarters(d(), 3)),
      endOfQuarter(subQuarters(d(), 3))
    ] as DateRange
};

export type QuickRangeOptions = 'custom' | keyof typeof DateRangeLogic;
export type QuickRangeType = 'day' | 'month' | 'quarter';

const get2DigYr = (date: Date) => String(getYear(date)).slice(2);

const qtrLetterMap = {
  1: 'JFM',
  2: 'AMJ',
  3: 'JAS',
  4: 'OND'
};

const getQtrForRange = (range: keyof typeof DateRangeLogic) =>
  getQuarter(DateRangeLogic[range]()[0]);

export const presetOptions: {
  type: QuickRangeType;
  value: QuickRangeOptions;
  label: string;
  numDays: number;
}[] = [
  { type: 'day', value: 'custom', label: 'Custom', numDays: -1 },
  { type: 'day', value: 'yesterday', label: 'Yesterday', numDays: 1 },
  { type: 'day', value: 'oneWeek', label: 'Last 7d', numDays: 7 },
  { type: 'day', value: 'twoWeeks', label: 'Last 14d', numDays: 14 },
  { type: 'day', value: 'oneMonth', label: 'Last 30d', numDays: 30 },
  { type: 'day', value: 'threeMonths', label: 'Last 90d', numDays: 90 },
  {
    type: 'month',
    value: 'minus2Month',
    label: `${format(DateRangeLogic.minus2Month()[0], 'MMM')}'${get2DigYr(
      DateRangeLogic.minus2Month()[0]
    )}`,
    numDays: Math.abs(differenceInDays(...DateRangeLogic.minus2Month()))
  },
  {
    type: 'month',
    value: 'minus1Month',
    label: `${format(DateRangeLogic.minus1Month()[0], 'MMM')}'${get2DigYr(
      DateRangeLogic.minus1Month()[0]
    )}`,
    numDays: Math.abs(differenceInDays(...DateRangeLogic.minus1Month()))
  },
  {
    type: 'month',
    value: 'currMonth',
    label: `${format(DateRangeLogic.currMonth()[0], 'MMM')}'${get2DigYr(
      DateRangeLogic.currMonth()[0]
    )}`,
    numDays: Math.abs(differenceInDays(...DateRangeLogic.currMonth()))
  },
  {
    type: 'quarter',
    value: 'minus3Qtr',
    label: `Q${getQtrForRange('minus3Qtr')}'${get2DigYr(
      DateRangeLogic.minus3Qtr()[0]
    )} / ${
      qtrLetterMap[getQtrForRange('minus3Qtr') as keyof typeof qtrLetterMap]
    }`,
    numDays: Math.abs(differenceInDays(...DateRangeLogic.minus3Qtr()))
  },
  {
    type: 'quarter',
    value: 'minus2Qtr',
    label: `Q${getQtrForRange('minus2Qtr')}'${get2DigYr(
      DateRangeLogic.minus2Qtr()[0]
    )} / ${
      qtrLetterMap[getQtrForRange('minus2Qtr') as keyof typeof qtrLetterMap]
    }`,
    numDays: Math.abs(differenceInDays(...DateRangeLogic.minus2Qtr()))
  },
  {
    type: 'quarter',
    value: 'minus1Qtr',
    label: `Q${getQtrForRange('minus1Qtr')}'${get2DigYr(
      DateRangeLogic.minus1Qtr()[0]
    )} / ${
      qtrLetterMap[getQtrForRange('minus1Qtr') as keyof typeof qtrLetterMap]
    }`,
    numDays: Math.abs(differenceInDays(...DateRangeLogic.minus1Qtr()))
  },
  {
    type: 'quarter',
    value: 'currQtr',
    label: `Q${getQtrForRange('currQtr')}'${get2DigYr(
      DateRangeLogic.currQtr()[0]
    )} / ${
      qtrLetterMap[getQtrForRange('currQtr') as keyof typeof qtrLetterMap]
    }`,
    numDays: Math.abs(differenceInDays(...DateRangeLogic.currQtr()))
  }
];

export const defaultDate = {
  preset: 'twoWeeks',
  range: DateRangeLogic.twoWeeks()
} as {
  preset: QuickRangeOptions;
  range: DateRange;
};

export const DATE_RANGE_MAX_DIFF = 95;
