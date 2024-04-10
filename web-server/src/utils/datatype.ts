import { clamp, mergeDeepRight } from 'ramda';

export const merge: typeof Object.assign = <T>(...objs: T[]) =>
  Object.assign({}, ...objs);

export const deepMerge = mergeDeepRight;

export const isObj = (o: any) => o?.constructor === Object;

export const percent = (val: number, max: number = 100) => {
  if (val === 0 && max === 0) return 0;
  if (val === Infinity && max === Infinity) return Infinity;
  return Math.round((val * 100) / max);
};

export const percentWithDecimals = (
  val: number,
  max: number = 100,
  decimalPlaces: number = 2
) => {
  if (val === 0 && max === 0) return 0;
  if (val === Infinity && max === Infinity) return Infinity;
  return Number(((val * 100) / max).toFixed(decimalPlaces));
};

export { v4 as uuid } from 'uuid';

const homogenizeRegex = /-|_|\ /g;
export const homogenize = (text?: string) =>
  text?.toLowerCase().replaceAll(homogenizeRegex, '');

export const emptyOr = <T1 = any, T2 = any>(...args: [T1, T2]) =>
  args.find((arg) => {
    if (!Boolean(arg)) return false;
    if (Array.isArray(arg) && !arg.length) return false;
    if (typeof arg === 'string' && !arg.trim().length) return false;
    if (isObj(arg) && !Object.keys(arg).length) return false;

    return true;
  });

export const flattenObj = (
  obj: any,
  parentKey = '',
  map = {} as Record<string, any>
) => {
  if (!isObj(obj)) return obj;

  for (let key in obj) {
    if (isObj(obj[key])) flattenObj(obj[key], `${parentKey}${key}__`, map);
    else map[`${parentKey}${key}`] = obj[key];
  }

  return map;
};

/**
 * Use like `array.map(indexify)` to get an array of numbers
 * @param _val ignored
 * @param index number
 * @returns number
 */
export const indexify = (_val: any, index: number) => index;

export const checkForNestedTrueValue = <T>(payload: T): boolean => {
  if (typeof payload === 'boolean') return payload;
  if (Array.isArray(payload))
    return payload.some((ele) => checkForNestedTrueValue(ele));

  if (typeof payload === 'object')
    return Object.values(payload).some((value) => {
      if (value) return true;
      if (typeof value === 'object') return checkForNestedTrueValue(value);
    });
  return false;
};

export const clampBetween100 = (value: number) => clamp(-100, 100, value);

export const percentageToMultiplier = (percentage: number) => {
  if (percentage === 0) return 0;
  const multiplier = percentage / 100;
  return Number((multiplier < 0 ? multiplier - 1 : multiplier + 1).toFixed(2));
};

export const checkForMultiplierBasedComparison = (rawChange: number) =>
  Math.abs(0 - rawChange) > 100 && Math.abs(rawChange) !== Infinity;
