import { secondsInDay, secondsInHour, secondsInMinute } from 'date-fns';

import { createTickArray, generateArrayWithSteps } from '../array';

const objGen = (i: number) => ({
  x: i,
  y: i
});

describe('generateArrayWithSteps', () => {
  test('generates array with steps', () => {
    const result = generateArrayWithSteps(10, 2);
    expect(result).toEqual([0, 2, 4, 6, 8, 10]);
  });
  test('generates array with step as 0', () => {
    const result = generateArrayWithSteps(24, 0);
    expect(result).toEqual([]);
  });
});

describe('createTickArray in seconds', () => {
  const dataLessThan10Sec = [10 - 1].map(objGen);
  const dataLessThan20Sec = [20 - 1].map(objGen);
  const dataLessThan30Sec = [30 - 1].map(objGen);

  test('generates array with steps for data less than 10 seconds', () => {
    const result = createTickArray(dataLessThan10Sec, { isTimeBased: true });
    expect(result).toEqual([0, 2, 4, 6, 8, 10]);
  });
  test('generates array with steps for data less than 20 seconds', () => {
    const result = createTickArray(dataLessThan20Sec, { isTimeBased: true });
    expect(result).toEqual([0, 5, 10, 15, 20]);
  });
  test('generates array with steps for data less than 30 seconds', () => {
    const result = createTickArray(dataLessThan30Sec, { isTimeBased: true });
    expect(result).toEqual([0, 10, 20, 30]);
  });
});

describe('createTickArray in minutes', () => {
  const dataLessThan1Min = [1 * secondsInMinute - 1].map(objGen);
  const dataLessThan2Min = [2 * secondsInMinute - 1].map(objGen);
  const dataLessThan5Min = [5 * secondsInMinute - 1].map(objGen);
  const dataLessThan10Min = [10 * secondsInMinute - 1].map(objGen);
  const dataLessThan20Min = [20 * secondsInMinute - 1].map(objGen);
  const dataLessThan30Min = [30 * secondsInMinute - 1].map(objGen);

  test('generates array with steps for data less than 1 minute', () => {
    const result = createTickArray(dataLessThan1Min, { isTimeBased: true });
    expect(result).toEqual([0, 15, 30, 45, 60]);
  });
  test('generates array with steps for data less than 2 minutes', () => {
    const result = createTickArray(dataLessThan2Min, { isTimeBased: true });
    expect(result).toEqual([0, 30, 60, 90, 120]);
  });
  test('generates array with steps for data less than 5 minutes', () => {
    const result = createTickArray(dataLessThan5Min, { isTimeBased: true });
    expect(result).toEqual([0, 60, 120, 180, 240, 300]);
  });
  test('generates array with steps for data less than 10 minutes', () => {
    const result = createTickArray(dataLessThan10Min, { isTimeBased: true });
    expect(result).toEqual([0, 120, 240, 360, 480, 600]);
  });
  test('generates array with steps for data less than 20 minutes', () => {
    const result = createTickArray(dataLessThan20Min, { isTimeBased: true });
    expect(result).toEqual([0, 300, 600, 900, 1200]);
  });
  test('generates array with steps for data less than 30 minutes', () => {
    const result = createTickArray(dataLessThan30Min, { isTimeBased: true });
    expect(result).toEqual([0, 600, 1200, 1800]);
  });
});

describe('createTickArray in hours', () => {
  const dataLessThan1Hour = [1 * secondsInHour - 1].map(objGen);
  const dataLessThan2Hour = [2 * secondsInHour - 1].map(objGen);
  const dataLessThan5Hour = [5 * secondsInHour - 1].map(objGen);
  const dataLessThan10Hour = [10 * secondsInHour - 1].map(objGen);
  const data18Hours = [18 * secondsInHour].map(objGen);

  test('generates array with steps for data less than 1 hour', () => {
    const result = createTickArray(dataLessThan1Hour, { isTimeBased: true });
    expect(result).toEqual([0, 900, 1800, 2700, 3600]);
  });
  test('generates array with steps for data less than 2 hours', () => {
    const result = createTickArray(dataLessThan2Hour, { isTimeBased: true });
    expect(result).toEqual([0, 1800, 3600, 5400, 7200]);
  });
  test('generates array with steps for data less than 5 hours', () => {
    const result = createTickArray(dataLessThan5Hour, { isTimeBased: true });
    expect(result).toEqual([0, 3600, 7200, 10800, 14400, 18000]);
  });
  test('generates array with steps for data less than 10 hours', () => {
    const result = createTickArray(dataLessThan10Hour, { isTimeBased: true });
    expect(result).toEqual([0, 7200, 14400, 21600, 28800, 36000]);
  });
  test('generates array with steps for data 18 hours', () => {
    const result = createTickArray(data18Hours, { isTimeBased: true });
    expect(result).toEqual([
      0, 7200, 14400, 21600, 28800, 36000, 43200, 50400, 57600, 64800, 72000
    ]);
  });
});

describe('createTickArray in days', () => {
  const dataLessThan1Day = [1 * secondsInDay - 1].map(objGen);
  const dataLessThan5Day = [5 * secondsInDay - 1].map(objGen);
  const dataLessThan10Day = [10 * secondsInDay - 1].map(objGen);

  test('generates array with steps for data less than 1 day', () => {
    const result = createTickArray(dataLessThan1Day, { isTimeBased: true });
    expect(result).toEqual([0, 21600, 43200, 64800, 86400]);
  });

  test('generates array with steps for data less than 5 days', () => {
    const result = createTickArray(dataLessThan5Day, { isTimeBased: true });
    expect(result).toEqual([0, 86400, 172800, 259200, 345600, 432000]);
  });
  test('generates array with steps for data less than 10 days', () => {
    const result = createTickArray(dataLessThan10Day, { isTimeBased: true });
    expect(result).toEqual([0, 172800, 345600, 518400, 691200, 864000]);
  });
});

describe('createTickArray in weeks', () => {
  const dataLessThan1Week = [1 * secondsInDay * 7 - 1].map(objGen);
  const dataLessThan2Week = [2 * secondsInDay * 7 - 1].map(objGen);
  const dataLessThan5Week = [5 * secondsInDay * 7 - 1].map(objGen);

  test('generates array with steps for data less than 1 week', () => {
    const result = createTickArray(dataLessThan1Week, { isTimeBased: true });
    expect(result).toEqual([0, 172800, 345600, 518400, 691200]);
  });
  test('generates array with steps for data less than 2 weeks', () => {
    const result = createTickArray(dataLessThan2Week, { isTimeBased: true });
    expect(result).toEqual([0, 259200, 518400, 777600, 1036800, 1296000]);
  });

  test('generates array with steps for data less than 5 weeks', () => {
    const result = createTickArray(dataLessThan5Week, { isTimeBased: true });
    expect(result).toEqual([0, 604800, 1209600, 1814400, 2419200, 3024000]);
  });
});
