import { buildLocCardModel } from '../locCard';

// CLUSTOX: not invented numbers. This is the live response from
// `GET /teams/<id>/loc` and `/loc/trends` on the running container, copied
// verbatim, so these assertions prove real values survive the trip from the
// wire to the card rather than proving the builder agrees with itself.
const CURRENT = {
  additions: 149332,
  deletions: 20650,
  total: 169982,
  avg_pr_size: 654
};

const PREVIOUS = {
  additions: 63033,
  deletions: 7407,
  total: 70440,
  avg_pr_size: 640
};

const TRENDS = {
  '2026-07-20T00:00:00+00:00': {
    additions: 63033,
    deletions: 7407,
    total: 70440,
    avg_pr_size: 640
  },
  '2026-07-27T00:00:00+00:00': {
    additions: 65867,
    deletions: 10086,
    total: 75953,
    avg_pr_size: 575
  },
  '2026-08-03T00:00:00+00:00': {
    additions: 20432,
    deletions: 3157,
    total: 23589,
    avg_pr_size: 1310
  },
  '2026-08-10T00:00:00+00:00': {
    additions: 0,
    deletions: 0,
    total: 0,
    avg_pr_size: 0
  }
};

const stats = { current: CURRENT, previous: PREVIOUS };
const trends = { current: TRENDS, previous: {} };

describe('buildLocCardModel', () => {
  it('carries the measured numbers through to the card', () => {
    const model = buildLocCardModel(stats, trends);

    expect(model.isMeasured).toBe(true);
    expect(model.total).toBe(169982);
    expect(model.additions).toBe(149332);
    expect(model.deletions).toBe(20650);
    expect(model.avgPrSize).toBe(654);
    expect(model.prevTotal).toBe(70440);
    expect(model.prevAvgPrSize).toBe(640);
  });

  it('feeds the band the avg_pr_size series, never the totals series', () => {
    // CLUSTOX: the defect this whole test file exists for. Both series are
    // arrays of plausible numbers off the same objects, so a mix-up type-checks,
    // renders, and reads as data. Pinning the values means swapping the two
    // fields fails here rather than shipping a band drawn in lines-per-PR over
    // an axis of weekly totals.
    const model = buildLocCardModel(stats, trends);

    expect(model.avgPrSizeValues).toEqual([640, 575, 1310, 0]);
    expect(Math.max(...model.avgPrSizeValues)).toBe(1310);
    expect(model.avgPrSizeValues).not.toContain(75953);
  });

  it('orders the weekly series oldest first regardless of key order', () => {
    const model = buildLocCardModel(stats, {
      current: {
        '2026-08-03T00:00:00+00:00': TRENDS['2026-08-03T00:00:00+00:00'],
        '2026-07-20T00:00:00+00:00': TRENDS['2026-07-20T00:00:00+00:00']
      },
      previous: {
        '2026-07-27T00:00:00+00:00': TRENDS['2026-07-27T00:00:00+00:00']
      }
    });

    expect(model.avgPrSizeValues).toEqual([640, 575, 1310]);
  });

  it('degrades to an empty, non-throwing model when loc_stats is absent', () => {
    // CLUSTOX: the old-backend case -- `loc_stats` and `loc_trends` are
    // optional on the response and the BFF route degrades them to `undefined`
    // rather than failing the whole payload. Every one of these must be a
    // usable value, not a throw and not a null the card would then have to
    // guard again in JSX.
    const model = buildLocCardModel(undefined, undefined);

    expect(model.isMeasured).toBe(false);
    expect(model.canComparePrSize).toBe(false);
    expect(model.total).toBe(0);
    expect(model.avgPrSizeValues).toEqual([]);
  });

  it('survives loc_stats arriving without loc_trends', () => {
    const model = buildLocCardModel(stats, undefined);

    expect(model.isMeasured).toBe(true);
    expect(model.total).toBe(169982);
    expect(model.avgPrSizeValues).toEqual([]);
  });

  it('treats a measured zero as data, not as absence', () => {
    // CLUSTOX: a team that merged nothing gets `{additions: 0, ...}` from the
    // backend, which is a real measurement. It must still render the card --
    // only a missing `loc_stats` is "not measured".
    const zeroed = {
      additions: 0,
      deletions: 0,
      total: 0,
      avg_pr_size: 0
    };
    const model = buildLocCardModel(
      { current: zeroed, previous: zeroed },
      { current: {}, previous: {} }
    );

    expect(model.isMeasured).toBe(true);
    expect(model.total).toBe(0);
    // ...but there is no PR size to benchmark, so no band and no caption.
    // 0 beats every lower-is-better target and would otherwise congratulate a
    // team for shipping nothing.
    expect(model.canComparePrSize).toBe(false);
  });

  it('allows the comparison as soon as anything was merged', () => {
    const model = buildLocCardModel(stats, trends);

    expect(model.canComparePrSize).toBe(true);
  });
});
