import { path } from 'ramda';

export const groupBy = <T extends Record<string, any>[]>(
  arr: T,
  key: keyof T[number] = 'id',
  keyPath?: string
): Record<string, T[number]> =>
  arr.reduce((acc, cur) => {
    acc[path<string>(((keyPath || key) as string).split('.'), cur)] = cur;
    return acc;
  }, {});

export const groupObj = groupBy;

export default groupBy;
