jest.mock('@/api-helpers/axios', () => ({
  handleRequest: jest.fn()
}));

import { handleRequest } from '@/api-helpers/axios';

import { fetchLocStats } from '../cockpitMetricUtils';

const AGGREGATE = {
  additions: 149332,
  deletions: 20650,
  total: 169982,
  avg_pr_size: 654
};

const TRENDS = {
  '2026-07-20T00:00:00+00:00': {
    additions: 63033,
    deletions: 7407,
    total: 70440,
    avg_pr_size: 640
  }
};

const PR_FILTER = { pr_filter: { authors: ['hamad'] } } as any;

const callArgs = () =>
  fetchLocStats({
    teamId: 'team-1' as any,
    currStatsTimeObject: {
      from_time: '2026-07-01T00:00:00+00:00',
      to_time: '2026-08-01T00:00:00+00:00'
    } as any,
    prevStatsTimeObject: {
      from_time: '2026-06-01T00:00:00+00:00',
      to_time: '2026-07-01T00:00:00+00:00'
    } as any,
    currTrendsTimeObject: {
      from_time: '2026-07-01T00:00:00+00:00',
      to_time: '2026-08-01T00:00:00+00:00'
    } as any,
    prevTrendsTimeObject: {
      from_time: '2026-06-01T00:00:00+00:00',
      to_time: '2026-07-01T00:00:00+00:00'
    } as any,
    prFilter: PR_FILTER
  });

describe('fetchLocStats', () => {
  beforeEach(() => {
    (handleRequest as jest.Mock).mockReset();
    (handleRequest as jest.Mock)
      .mockResolvedValueOnce(AGGREGATE)
      .mockResolvedValueOnce(AGGREGATE)
      .mockResolvedValueOnce(TRENDS)
      .mockResolvedValueOnce(TRENDS);
  });

  it('returns the shape the dora_metrics route spreads onto its response', async () => {
    // CLUSTOX: the route does `loc_stats: locResponse?.loc_stats`, and the card
    // reads `metrics_summary.loc_stats.current.avg_pr_size`. This pins the
    // nesting between those two, which is exactly the contract that broke on
    // the predecessor branch -- a key attached one level off produced a payload
    // both the producer and its own test agreed on, and the consumer could not
    // read.
    const result = await callArgs();

    expect(result.loc_stats.current.avg_pr_size).toBe(654);
    expect(result.loc_stats.previous.total).toBe(169982);
    expect(result.loc_trends.current).toEqual(TRENDS);
    expect(result.loc_trends.previous).toEqual(TRENDS);
  });

  it('hits both the aggregate and the trends route, for both periods', async () => {
    await callArgs();

    const urls = (handleRequest as jest.Mock).mock.calls.map(([url]) => url);
    expect(urls.filter((u) => u === '/teams/team-1/loc')).toHaveLength(2);
    expect(urls.filter((u) => u === '/teams/team-1/loc/trends')).toHaveLength(2);
  });

  it('passes the pr_filter through on every call', async () => {
    // CLUSTOX: dropping the filter here would not fail any other assertion --
    // the call still succeeds and the numbers still look plausible. It would
    // just leave LOC reporting team-wide totals beside four contributor-filtered
    // cards, which reads as a data bug rather than a missing argument.
    await callArgs();

    for (const [, config] of (handleRequest as jest.Mock).mock.calls) {
      expect(config.params.pr_filter).toEqual(PR_FILTER.pr_filter);
    }
  });

  it('sends timestamps carrying a timezone offset', async () => {
    // CLUSTOX: the analytics route rejects a naive timestamp outright --
    // 400 "Timestamp passed without tz info". A stripped offset would take the
    // whole LOC fetch down, and the soft `.catch` in the route would then hide
    // it as a silently missing card.
    await callArgs();

    for (const [, config] of (handleRequest as jest.Mock).mock.calls) {
      expect(config.params.from_time).toMatch(/[+-]\d{2}:\d{2}$/);
      expect(config.params.to_time).toMatch(/[+-]\d{2}:\d{2}$/);
    }
  });
});
