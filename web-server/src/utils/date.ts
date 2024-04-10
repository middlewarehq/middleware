import {
  differenceInDays,
  endOfWeek,
  format,
  isBefore,
  isMonday,
  isSunday,
  nextSunday,
  previousMonday,
  secondsToHours,
  secondsToMinutes,
  startOfDay,
  startOfWeek,
  sub,
  subDays
} from 'date-fns';
import {
  differenceInWeeks,
  subWeeks,
  addDays,
  endOfDay,
  getDaysInMonth,
  startOfMonth,
  eachWeekOfInterval
} from 'date-fns';
import { partialRight } from 'ramda';
import { v4 as uuid } from 'uuid';

import { DateRangeMap } from '@/components/DateRangePicker';
import { IncidentWeekMapType, IncidentWeekType } from '@/types/resources';
import { staticArray } from '@/utils/mock';

import { merge } from './datatype';

export const isoDateString = (date: Date) =>
  format(date, "yyyy-MM-dd'T'HH:mm:ssxxx");

export const getDurationString = (
  secs?: number,
  options: {
    placeHolderTxtForNullValue?: string;
    /** How many parts of the time to show? At least 1 will always be shown. Max will be shown in the time. */
    segments?: number;
    /** If time is less than 60s, it'll return `< 1m`, else it'll return `42s` or something */
    showLt60AsSecs?: boolean;
  } = {}
) => {
  options = merge(
    { segments: 2, showLt60AsSecs: true } as typeof options,
    options
  );

  if (!secs || secs < 0) return options.placeHolderTxtForNullValue || null;
  if (secs < 60)
    return options?.showLt60AsSecs ? `${Math.ceil(secs)}s` : '< 1m';

  const mins = secondsToMinutes(secs);
  if (!mins) return null;
  const remainingSecs = Math.floor(secs % 60);
  if (mins < 60)
    return [`${mins}m`]
      .concat(options?.segments > 1 && remainingSecs && `${remainingSecs}s`)
      .filter(Boolean)
      .join(' ');

  const hours = secondsToHours(secs);
  const remainingMins = Math.floor(mins % 60);

  if (hours < 24)
    return [`${hours}h`]
      .concat(options?.segments > 1 && remainingMins && `${remainingMins}m`)
      .concat(options?.segments > 2 && remainingSecs && `${remainingSecs}m`)
      .filter(Boolean)
      .join(' ');

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days < 7) {
    return [`${days}d`]
      .concat(options?.segments > 1 && remainingHours && `${remainingHours}h`)
      .concat(options?.segments > 2 && remainingMins && `${remainingMins}s`)
      .concat(options?.segments > 3 && remainingSecs && `${remainingSecs}s`)
      .filter(Boolean)
      .join(' ');
  }

  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;

  return [`${weeks}w`]
    .concat(options?.segments > 1 && remainingDays && `${remainingDays}d`)
    .concat(options?.segments > 2 && remainingHours && `${remainingHours}h`)
    .concat(options?.segments > 3 && remainingMins && `${remainingMins}s`)
    .concat(options?.segments > 4 && remainingSecs && `${remainingSecs}s`)
    .filter(Boolean)
    .join(' ');
};

export const getDurationStringWithPlaceholderTxt = partialRight(
  getDurationString,
  [{ placeHolderTxtForNullValue: 'Not Avl.' }]
);

export const secondsInDay = 3600 * 24;

export const getWeeksArray = (dates: DateRangeMap) => {
  const numWeeks = differenceInWeeks(dates.end, dates.start);
  return staticArray(numWeeks ? numWeeks + 1 : 0).map((i) =>
    subWeeks(dates.end, i)
  );
};

export const getDateArray = (dates: DateRangeMap) => {
  const numDays = differenceInDays(dates.end, dates.start);
  return staticArray(numDays ? numDays + 1 : 0).map((i) =>
    subDays(dates.end, i)
  );
};

export const MONTH_FORMAT_KEY = 'yyyy-MM';
export const SUB_MONTH_FORMAT_KEY = "yyyy-MM-'w'ww-'d'dd";

export const getMonthHalves = (date: Date) => {
  const dayCount = getDaysInMonth(date);
  const monthStart = startOfMonth(date);
  const midMonth = addDays(monthStart, Math.round(dayCount / 2));
  return [monthStart, midMonth];
};

export const getMonthStartKey = (date: Date) =>
  format(startOfMonth(date), MONTH_FORMAT_KEY);

export const getMidMonthKey = (date: Date) => {
  const [start, mid] = getMonthHalves(date);
  const isFirstHalf = isBefore(date, mid);
  if (isFirstHalf) return format(start, SUB_MONTH_FORMAT_KEY);
  return format(mid, SUB_MONTH_FORMAT_KEY);
};

export const ordinal = (num: number) => {
  const lastDigit = num % 10;
  const rest = Math.floor(num / 10);
  switch (lastDigit) {
    case 1:
      return `${rest ? rest : ''}1st`;
    case 2:
      return `${rest ? rest : ''}2nd`;
    case 3:
      return `${rest ? rest : ''}3rd`;
    default:
      return `${num}th`;
  }
};

export const getDateWithComparisonRanges = (
  from_ts: DateString | Date,
  to_ts: DateString | Date
) => {
  const from = new Date(from_ts);
  const to = new Date(to_ts);

  const difference = Math.abs(differenceInDays(from, to));

  const compareFrom = subDays(from, difference);

  return {
    curr: { from, to: endOfDay(to) },
    prev: { from: compareFrom, to: from }
  };
};

export const getWeeksMapInRange = (
  from_ts: DateString | Date,
  to_ts: DateString | Date
): IncidentWeekMapType => {
  const from = new Date(from_ts);
  const to = new Date(to_ts);
  const weeks = eachWeekOfInterval({
    start: from,
    end: to
  });
  const weeks_map = {} as Record<string, IncidentWeekType>;
  weeks.forEach((week, index) => {
    const weekId = uuid();
    weeks_map[weekId] = {
      id: weekId,
      week_start_time: week,
      week_index: index + 1
    };
  });
  return weeks_map;
};

export const getPrevInterval = (from_date: Date, to_date: Date) => {
  const difference = differenceInDays(to_date, from_date);

  const prevIntervalEndDay = endOfDay(sub(from_date, { days: 1 }));
  const prevIntervalStartDay = startOfDay(
    sub(prevIntervalEndDay, { days: difference })
  );

  return [prevIntervalStartDay, prevIntervalEndDay];
};

export const getStartOfTheWeek = (givenDate: Date | DateString) => {
  return isoDateString(
    startOfDay(startOfWeek(new Date(givenDate), { weekStartsOn: 1 }))
  );
};

export const getEndOfTheWeek = (givenDate: Date | DateString) => {
  return isoDateString(
    endOfDay(endOfWeek(new Date(givenDate), { weekStartsOn: 1 }))
  );
};

const customDateComparator = (a: string, b: string) =>
  new Date(a).getTime() - new Date(b).getTime();

export const getSortedDatesAsArrayFromMap = (
  dateMap: Record<DateString, any>
): DateString[] => {
  if (!dateMap) return [];
  return Object.keys(dateMap).sort(customDateComparator);
};

export const getWeekStartAndEndInterval = (
  from_time: Date | DateString,
  to_time: Date | DateString,
  formatAsIsoString: boolean = true
) => {
  const fromTimeDateObj = new Date(from_time);
  const toTimeDateObj = new Date(to_time);

  const intervalEndDay = endOfDay(
    isSunday(toTimeDateObj) ? toTimeDateObj : nextSunday(toTimeDateObj)
  );
  const intervalStartDay = startOfDay(
    isMonday(fromTimeDateObj)
      ? fromTimeDateObj
      : previousMonday(fromTimeDateObj)
  );

  return [
    formatAsIsoString ? isoDateString(intervalStartDay) : intervalStartDay,
    formatAsIsoString ? isoDateString(intervalEndDay) : intervalEndDay
  ];
};

export const daysToSeconds = (days: number) => days * secondsInDay;

export const getAggregateAndTrendsIntervalTime = (
  from_time: DateString | Date,
  to_time: DateString | Date
) => {
  const fromTimeDateObj = startOfDay(new Date(from_time));
  const toTimeDateObj = endOfDay(new Date(to_time));
  const currTrendsTimeObject = {
    from_time: isoDateString(
      startOfDay(
        isMonday(fromTimeDateObj)
          ? fromTimeDateObj
          : previousMonday(fromTimeDateObj)
      )
    ),
    to_time: isoDateString(
      endOfDay(
        isSunday(toTimeDateObj) ? toTimeDateObj : nextSunday(toTimeDateObj)
      )
    )
  };
  const [prevIntervalStartDate, prevIntervalEndDate] = getPrevInterval(
    fromTimeDateObj,
    toTimeDateObj
  );

  const prevTrendsTimeObject = {
    from_time: isoDateString(
      startOfDay(
        isMonday(prevIntervalStartDate)
          ? prevIntervalStartDate
          : previousMonday(prevIntervalStartDate)
      )
    ),
    to_time: isoDateString(
      endOfDay(
        isSunday(prevIntervalEndDate)
          ? prevIntervalEndDate
          : nextSunday(prevIntervalEndDate)
      )
    )
  };
  const [prevCycleStartDay, prevCycleEndDay] = getPrevInterval(
    fromTimeDateObj,
    toTimeDateObj
  );
  return {
    currTrendsTimeObject,
    prevTrendsTimeObject,
    prevCycleStartDay,
    prevCycleEndDay,
    currentCycleStartDay: fromTimeDateObj,
    currentCycleEndDay: toTimeDateObj
  };
};
