import {
  checkForMultiplierBasedComparison,
  percent,
  percentageToMultiplier
} from '../datatype';

describe('percentageToMultiplier', () => {
  test('converts percentage to multiplier with positive change', () => {
    expect(percentageToMultiplier(50)).toBe(1.5);
  });
  test('converts percentage to multiplier with negative change', () => {
    expect(percentageToMultiplier(-50)).toBe(-1.5);
  });

  test('converts percentage to multiplier with larger positive change', () => {
    expect(percentageToMultiplier(100)).toBe(2);
  });
  test('converts percentage to multiplier with larger negative change', () => {
    expect(percentageToMultiplier(-100)).toBe(-2);
  });

  test('converts percentage to multiplier with even larger negative change', () => {
    expect(percentageToMultiplier(-150)).toBe(-2.5);
  });

  test('converts percentage to multiplier with the maximum possible negative change', () => {
    expect(percentageToMultiplier(-1000)).toBe(-11);
  });
  test('converts percentage to multiplier with the maximum possible positive change', () => {
    expect(percentageToMultiplier(1000)).toBe(11);
  });

  test('converts percentage to multiplier with the minimum possible change (0 to 0)', () => {
    expect(percentageToMultiplier(0)).toBe(0);
  });
});

describe('checkForMultiplierBasedComparison', () => {
  test('returns true for larger positive change', () => {
    expect(checkForMultiplierBasedComparison(150)).toBe(true);
  });

  test('returns true for larger negative change', () => {
    expect(checkForMultiplierBasedComparison(-150)).toBe(true);
  });

  test('returns false for smaller positive change', () => {
    expect(checkForMultiplierBasedComparison(50)).toBe(false);
  });

  test('returns false for smaller negative change', () => {
    expect(checkForMultiplierBasedComparison(-50)).toBe(false);
  });

  test('returns false for the minimum possible change (0 to 0)', () => {
    expect(checkForMultiplierBasedComparison(0)).toBe(false);
  });

  test('returns false for the maximum possible negative change', () => {
    expect(checkForMultiplierBasedComparison(-100)).toBe(false);
  });

  test('returns false for the maximum possible positive change', () => {
    expect(checkForMultiplierBasedComparison(100)).toBe(false);
  });

  test('returns false for Infinity', () => {
    expect(checkForMultiplierBasedComparison(Infinity)).toBe(false);
    expect(checkForMultiplierBasedComparison(-Infinity)).toBe(false);
  });
});

describe('percent function', () => {
  // 100, -100 => -100 ! Negative denominator are not tested for

  test('for positive numerators', () => {
    expect(percent(10.34)).toBe(10);
    expect(percent(30, 100)).toBe(30);
    expect(percent(34.9, 100)).toBe(35);
    expect(percent(1, 3)).toBe(33);
  });
  test('for negative numerators', () => {
    expect(percent(-10.34)).toBe(-10);
    expect(percent(-30, 100)).toBe(-30);
    expect(percent(-34.9, 100)).toBe(-35);
    expect(percent(-1, 3)).toBe(-33);
  });
  test('for zero based values', () => {
    expect(percent(0)).toBe(0);
    expect(percent(0, 100)).toBe(0);
    expect(percent(0, 0)).toBe(0);
    expect(percent(4, 0)).toBe(Infinity);
  });
  test('for infinity based values', () => {
    expect(percent(0, Infinity)).toBe(0);
    expect(percent(Infinity, 0)).toBe(Infinity);
    expect(percent(Infinity, Infinity)).toBe(Infinity);
    expect(percent(24, Infinity)).toBe(0);
    expect(percent(Infinity, 24)).toBe(Infinity);
  });
});
