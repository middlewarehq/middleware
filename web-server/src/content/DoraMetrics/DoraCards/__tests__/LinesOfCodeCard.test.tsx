// CLUSTOX: this project has repeatedly shipped defects where data was
// produced correctly and dropped one layer downstream, so the model unit test
// alone is not enough -- it proves the numbers are derived, not that they are
// rendered. This renders the real component and asserts on its output.
//
// The mocks below replace exactly three things and nothing else: the redux
// store (so a payload can be posed), the contributor filter (a router-backed
// hook), and `Chart2` (a `next/dynamic` client-only chart). Chart2's stand-in
// records the props it was handed, which is how the series/band unit pairing
// is checked at the point it actually matters.
import { ThemeProvider } from '@mui/material';
import { renderToStaticMarkup } from 'react-dom/server';

import { MainTheme } from '@/theme/schemes/theme';
import type { TeamDoraMetricsApiResponseType } from '@/types/resources';

const chartCalls: { series: any; options: any }[] = [];

let metricsSummary: Partial<TeamDoraMetricsApiResponseType> | undefined;

jest.mock('@/store', () => ({
  useSelector: (selector: (s: any) => unknown) =>
    selector({ doraMetrics: { metrics_summary: metricsSummary } }),
  useDispatch: () => () => undefined
}));

// CLUSTOX: the comparison pill is shared with all four existing cards and
// reaches for the team/date config through redux. Stubbed to the two numbers
// it was handed, which is the only part of it this card is responsible for.
jest.mock('../../DoraMetricsComparisonPill', () => ({
  DoraMetricsComparisonPill: ({ val, against }: any) =>
    `[pill ${val} vs ${against}]`
}));

jest.mock('@/components/ContributorFilter', () => ({
  useSelectedContributors: () => [] as string[]
}));

jest.mock('@/components/Chart2', () => ({
  Chart2: (props: any) => {
    chartCalls.push({ series: props.series, options: props.options });
    return null;
  }
}));

import { LinesOfCodeCard } from '../LinesOfCodeCard';

const LOC_STATS = {
  current: {
    additions: 149332,
    deletions: 20650,
    total: 169982,
    avg_pr_size: 654
  },
  previous: {
    additions: 63033,
    deletions: 7407,
    total: 70440,
    avg_pr_size: 640
  }
};

const LOC_TRENDS = {
  current: {
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
    }
  },
  previous: {}
};

// CLUSTOX: the real app theme, not a stub. `benchmarkBandOptions` reads
// `theme.colors.success.main` off it, and the card's tooltips are styled from
// it too -- a stub would pass while the app crashed on the same code path.
const render = () =>
  renderToStaticMarkup(
    <ThemeProvider theme={MainTheme}>
      <LinesOfCodeCard />
    </ThemeProvider>
  );

beforeEach(() => {
  chartCalls.length = 0;
  metricsSummary = undefined;
});

describe('LinesOfCodeCard', () => {
  it('renders the measured numbers, not just derives them', () => {
    metricsSummary = { loc_stats: LOC_STATS, loc_trends: LOC_TRENDS } as any;

    const html = render();

    // CLUSTOX: the headline itself runs through `useCountUp`, which animates
    // from 0 on an interval and so is still 0 in a single server render --
    // exactly as it is on the first painted frame in the browser. Its exact
    // figure is asserted through the tooltip it also renders, which is not
    // animated, so the real 169,982 is still pinned here.
    expect(html).toContain('169,982 lines changed');
    expect(html).toContain('70,440 in the previous period');
    expect(html).toContain('+149.3K');
    expect(html).toContain('20.7K');
    expect(html).toContain('149,332 added, 20,650 deleted');
    // The benchmarked figure, spelled out rather than compacted.
    expect(html).toContain('Avg. PR size 654 lines');
    // Previous-period delta rides on PR size, not on the directionless total.
    expect(html).toContain('[pill 654 vs 640]');
  });

  it('draws the band over the avg_pr_size series, in lines-per-PR', () => {
    metricsSummary = {
      loc_stats: LOC_STATS,
      loc_trends: LOC_TRENDS,
      benchmarks: { lines_of_code: { target: 200, source: 'team' } }
    } as any;

    const html = render();

    // CLUSTOX: the whole point. A band whose target is 200 lines/PR drawn over
    // a series of weekly totals (70440, 75953, 23589) would be a hairline on
    // the axis floor -- correct arithmetic, unreadable, and unquestioned.
    expect(chartCalls).toHaveLength(1);
    expect(chartCalls[0].series[0].data).toEqual([640, 575, 1310]);

    const annotations =
      chartCalls[0].options.options.plugins.annotation.annotations;
    expect(annotations.targetLine.yMin).toBe(200);
    // The axis is sized to the avg_pr_size series (max 1310), not to 75953.
    expect(chartCalls[0].options.options.scales.y.suggestedMax).toBeLessThan(
      2000
    );

    // Caption and band agree: 654 lines/PR against a 200 lines/PR target.
    expect(html).toContain('654 lines is over target (200 lines)');
  });

  it('renders with loc_stats absent instead of throwing', () => {
    // CLUSTOX: the old-backend case, and the reason it matters: this card
    // renders inside the same tree as the other four, so an exception here
    // would unmount all of them. "Does not throw" is the regression guarantee.
    metricsSummary = {
      lead_time_stats: { current: { lead_time: 3600 } }
    } as any;

    const html = render();

    expect(html).toContain('Lines of code unavailable');
    expect(html).not.toContain('Avg. PR size');
    // No chart at all, so nothing for a band to be drawn over.
    expect(chartCalls).toHaveLength(0);
  });

  it('renders with the entire metrics_summary absent', () => {
    metricsSummary = undefined;

    expect(() => render()).not.toThrow();
    expect(render()).toContain('Lines of code unavailable');
  });

  it('shows a measured zero as data, with no band and no caption', () => {
    const zero = { additions: 0, deletions: 0, total: 0, avg_pr_size: 0 };
    metricsSummary = {
      loc_stats: { current: zero, previous: zero },
      loc_trends: { current: {}, previous: {} },
      benchmarks: { lines_of_code: { target: 200, source: 'team' } }
    } as any;

    const html = render();

    expect(html).toContain('Lines changed');
    expect(html).not.toContain('Lines of code unavailable');
    // CLUSTOX: 0 beats every lower-is-better target. Congratulating a team for
    // shipping nothing is the failure mode this asserts against.
    expect(html).not.toContain('under target');
    expect(chartCalls[0].options.options.plugins?.annotation).toBeUndefined();
  });
});
