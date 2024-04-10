import faker from '@faker-js/faker';

export const staticArray = <T = number>(
  length: number,
  proc = (num: number) => num
) =>
  Array(Math.max(Number.isFinite(length) ? length : 0, 0))
    .fill(0)
    .map((_, i) => proc(i)) as unknown as T[];

export const arraySize = (max: number = 5, min: number = 0) =>
  staticArray(randInt(max, min));

export const flexibleArray = arraySize;

export const randomDuration = () =>
  faker.datatype.number({ min: 0, max: 10, precision: 0.1 });

export const randInt = (n1: number, n2: number = 0) =>
  faker.datatype.number({ min: Math.min(n1, n2), max: Math.max(n1, n2) });

export const arrayDivByN = <T>(arr: Array<T>, parts: number = 1) => {
  const chunkSize = Math.floor(arr.length / parts);
  const rem = arr.length % parts;
  let start = 0;
  let end = chunkSize + rem;
  const res = [arr.slice(start, end)];
  for (let i = 1; i < parts; i++) {
    start = end;
    end = end + chunkSize;
    res.push(arr.slice(start, end));
  }
  return res;
};
