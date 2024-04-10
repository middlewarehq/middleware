import { secondsInDay } from 'date-fns';

import {
  calculateTicks,
  calculateMaxScale,
  calculateWeekFactor
} from './utils';

describe('calculateTicks', () => {
  it('calculates ticks correctly', () => {
    const inputs = [
      {
        input: 1.5 * secondsInDay,
        ans: [0, 21600, 43200, 64800, 86400, 108000, 129600]
      },
      {
        input: 2 * secondsInDay,
        ans: [0, 21600, 43200, 64800, 86400, 108000, 129600, 151200, 172800]
      },
      {
        input: 2.5 * secondsInDay,
        ans: [0, 86400, 172800, 259200]
      },
      {
        input: 7 * secondsInDay,
        ans: [0, 86400, 172800, 259200, 345600, 432000, 518400, 604800]
      },
      {
        input: 7.5 * secondsInDay,
        ans: [0, 172800, 345600, 518400, 691200]
      },
      {
        input: 6.5 * secondsInDay,
        ans: [0, 86400, 172800, 259200, 345600, 432000, 518400, 604800]
      }
    ];

    inputs.forEach((item) =>
      expect(calculateTicks(item.input)).toEqual(item.ans)
    );
  });
});

describe('calculateWeekFactor', () => {
  it('calculates week factor correctly', () => {
    expect(calculateWeekFactor(10)).toEqual(2);
    expect(calculateWeekFactor(12)).toEqual(3);
    expect(calculateWeekFactor(18)).toEqual(3);
    expect(calculateWeekFactor(21)).toEqual(7);
    expect(calculateWeekFactor(23)).toEqual(7);
  });
});

describe('calculateMaxScale', () => {
  it('calculates max scale correctly', () => {
    const graphData7 = [
      {
        id: 'Aug, Wk 1',
        value: 87293.92857142857
      },
      {
        id: 'Aug, Wk 2',
        value: 93925.17647058824
      },
      {
        id: 'Aug, Wk 3',
        value: 400026
      },
      {
        id: 'Aug, Wk 4',
        value: 72418
      },
      {
        id: 'Aug, Wk 5',
        value: 35326.92857142857
      }
    ];

    const graphData14 = [
      {
        id: 'Jul, Wk 4',
        value: 28155.25
      },
      {
        id: 'Jul, Wk 5',
        value: 64288.5
      },
      {
        id: 'Aug, Wk 1',
        value: 94650.05882352941
      },
      {
        id: 'Aug, Wk 2',
        value: 830489.5
      },
      {
        id: 'Aug, Wk 3',
        value: 87293.92857142857
      },
      {
        id: 'Aug, Wk 4',
        value: 79953.33333333333
      },
      {
        id: 'Aug, Wk 5',
        value: 35326.92857142857
      }
    ];

    const graphData30 = [
      {
        id: 'Jun, Wk 4',
        value: 54532
      },
      {
        id: 'Jun, Wk 5',
        value: 74558.16666666667
      },
      {
        id: 'Jul, Wk 2',
        value: 37633.23684210526
      },
      {
        id: 'Jul, Wk 3',
        value: 25596.90625
      },
      {
        id: 'Jul, Wk 4',
        value: 34482.59375
      },
      {
        id: 'Jul, Wk 5',
        value: 16616.25
      },
      {
        id: 'Aug, Wk 1',
        value: 23640.69230769231
      },
      {
        id: 'Aug, Wk 2',
        value: 64288.5
      },
      {
        id: 'Aug, Wk 3',
        value: 92542.26666666666
      },
      {
        id: 'Aug, Wk 4',
        value: 79953.33333333333
      },
      {
        id: 'Aug, Wk 5',
        value: 35326.92857142857
      }
    ];

    const graphData90 = [
      {
        id: 'Feb, Wk 3',
        value: 232665
      },
      {
        id: 'Feb, Wk 4',
        value: 61722.041666666664
      },
      {
        id: 'Mar, Wk 1',
        value: 69220.33333333333
      },
      {
        id: 'Mar, Wk 2',
        value: 1054938.0606060605
      },
      {
        id: 'Mar, Wk 3',
        value: 1819208.2857142857
      },
      {
        id: 'Mar, Wk 4',
        value: 1129881.857142857
      },
      {
        id: 'Mar, Wk 5',
        value: 779654.9523809524
      },
      {
        id: 'Apr, Wk 2',
        value: 307398.73333333334
      },
      {
        id: 'Apr, Wk 3',
        value: 42331.80952380953
      },
      {
        id: 'Apr, Wk 4',
        value: 63170.6129032258
      },
      {
        id: 'Apr, Wk 5',
        value: 282312.1666666667
      },
      {
        id: 'May, Wk 1',
        value: 31364.57894736842
      },
      {
        id: 'May, Wk 2',
        value: 39024.76470588235
      },
      {
        id: 'May, Wk 3',
        value: 130564.5625
      },
      {
        id: 'May, Wk 4',
        value: 335304
      },
      {
        id: 'May, Wk 5',
        value: 94879.33333333333
      },
      {
        id: 'Jun, Wk 2',
        value: 44146.857142857145
      },
      {
        id: 'Jun, Wk 3',
        value: 79918.65217391304
      },
      {
        id: 'Jun, Wk 4',
        value: 73463.55
      },
      {
        id: 'Jun, Wk 5',
        value: 38753.64102564102
      },
      {
        id: 'Jul, Wk 2',
        value: 74558.16666666667
      },
      {
        id: 'Jul, Wk 3',
        value: 37633.23684210526
      },
      {
        id: 'Jul, Wk 4',
        value: 25596.90625
      },
      {
        id: 'Jul, Wk 5',
        value: 34482.59375
      },
      {
        id: 'Aug, Wk 1',
        value: 22704.1
      },
      {
        id: 'Aug, Wk 2',
        value: 64288.5
      },
      {
        id: 'Aug, Wk 3',
        value: 92542.26666666666
      },
      {
        id: 'Aug, Wk 4',
        value: 79953.33333333333
      },
      {
        id: 'Aug, Wk 5',
        value: 35326.92857142857
      }
    ];

    expect(calculateMaxScale(graphData7)).toEqual(432000);
    expect(calculateMaxScale(graphData14)).toEqual(864000);
    expect(calculateMaxScale(graphData30)).toEqual(172800);
    expect(calculateMaxScale(graphData90)).toEqual(1900800);
  });
});
