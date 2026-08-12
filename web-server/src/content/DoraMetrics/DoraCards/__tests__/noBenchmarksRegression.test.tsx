/**
 * The regression guarantee for the benchmark-bands + lines-of-code feature.
 *
 * With no benchmark configured anywhere -- no team row, no global baseline, so
 * `metrics_summary.benchmarks` is absent entirely -- every one of the five
 * cards must render exactly as it did before this feature: its measured
 * numbers, no shaded target band, no benchmark caption. This is the state every
 * installation is in until an admin sets a target, and the four cards people
 * already rely on must not move.
 *
 * CLUSTOX: `LinesOfCodeCard.test.tsx` covers the LOC card's own empty states,
 * and `benchmarks.test.ts` / `benchmarkBand.test.ts` cover the two utils
 * returning null for an absent target. Neither renders the four ORIGINAL
 * cards, which is where the regression would actually show up -- a card that
 * threw on `benchmarks` being undefined, or drew an annotation block against
 * `target: undefined`, would take the whole grid down and no existing test
 * would see it. That gap is what this file closes.
 *
 * Every mock below stands in for something the card reaches for that has
 * nothing to do with benchmarks -- redux, the router-backed contributor
 * filter, the auth context, the overlay router, and the `next/dynamic` chart.
 * Nothing on the benchmark path is mocked: `useDoraCardChartOptions`,
 * `benchmarkBandOptions` and `benchmarkCaption` all run for real.
 */
import { ThemeProvider } from '@mui/material';
import { renderToStaticMarkup } from 'react-dom/server';

import { MainTheme } from '@/theme/schemes/theme';

const chartCalls: { name: string; options: any }[] = [];

let metricsSummary: any;
let currentCardName = '';

jest.mock('@/store', () => ({
  useSelector: (selector: (s: any) => unknown) =>
    selector({
      doraMetrics: {
        metrics_summary: metricsSummary,
        allReposAssignedToTeam: []
      }
    }),
  useDispatch: () => () => undefined
}));

jest.mock('@/components/ContributorFilter', () => ({
  useSelectedContributors: () => [] as string[]
}));

jest.mock('@/components/Chart2', () => ({
  Chart2: (props: any) => {
    chartCalls.push({ name: currentCardName, options: props.options });
    return null;
  }
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    // Both integration groups present, so every card takes its
    // data-available branch rather than short-circuiting to a placeholder --
    // a card showing NoDataImg would trivially have no band.
    integrationSet: new Set(['CODE', 'INCIDENT']),
    orgId: 'org-1',
    role: 'ADMIN'
  })
}));

jest.mock('@/components/OverlayPageContext', () => ({
  useOverlayPage: () => ({ addPage: () => undefined })
}));

jest.mock('@/hooks/useStateTeamConfig', () => ({
  useStateDateConfig: () => ({ weeksCovered: 4, daysCovered: 0 }),
  useCurrentDateRangeLabel: () => 'last 4 weeks',
  useSingleTeamConfig: () => ({ singleTeamId: 'team-1' }),
  useStateTeamConfig: () => ({ singleTeamId: 'team-1' })
}));

jest.mock('@/hooks/useDoraMetricsGraph', () => ({
  useDoraMetricsGraph: () => ({
    trendsSeriesMap: {
      changeFailureRateTrends: [{ data: [{ y: 10 }, { y: 14 }, { y: 12 }] }],
      meanTimeToRestoreTrends: [
        { data: [{ y: 3600 }, { y: 5400 }, { y: 4200 }] }
      ]
    }
  })
}));

jest.mock('@/constants/events', () => ({
  track: () => undefined,
  TrackEvents: {}
}));

jest.mock('../../DoraMetricsComparisonPill', () => ({
  DoraMetricsComparisonPill: () => null
}));

import { ChangeFailureRateCard } from '../ChangeFailureRateCard';
import { ChangeTimeCard } from '../ChangeTimeCard';
import { LinesOfCodeCard } from '../LinesOfCodeCard';
import { MeanTimeToRestoreCard } from '../MeanTimeToRestoreCard';
import { WeeklyDeliveryVolumeCard } from '../WeeklyDeliveryVolumeCard';

/**
 * A fully-measured dashboard: every metric has real current and previous
 * numbers and real trends. The only thing missing is `benchmarks`.
 */
const MEASURED_SUMMARY = {
  lead_time_stats: {
    current: { lead_time: 86400, pr_count: 12 },
    previous: { lead_time: 93600, pr_count: 10 }
  },
  lead_time_trends: {
    current: {
      '2026-07-20T00:00:00+00:00': { lead_time: 90000 },
      '2026-07-27T00:00:00+00:00': { lead_time: 86400 }
    },
    previous: {}
  },
  deployment_frequency_stats: {
    current: {
      avg_deployment_frequency: 4,
      avg_weekly_deployment_frequency: 4,
      total_deployments: 16,
      duration: 'week'
    },
    previous: {
      avg_deployment_frequency: 3,
      avg_weekly_deployment_frequency: 3,
      total_deployments: 12,
      duration: 'week'
    }
  },
  deployment_frequency_trends: {
    current: {
      '2026-07-20T00:00:00+00:00': { count: 5 },
      '2026-07-27T00:00:00+00:00': { count: 4 }
    },
    previous: {}
  },
  change_failure_rate_stats: {
    current: { change_failure_rate: 12, total_deployments: 16 },
    previous: { change_failure_rate: 15, total_deployments: 12 }
  },
  change_failure_rate_trends: { current: {}, previous: {} },
  mean_time_to_restore_stats: {
    current: { mean_time_to_recovery: 4200, incident_count: 3 },
    previous: { mean_time_to_recovery: 5400, incident_count: 4 }
  },
  mean_time_to_restore_trends: { current: {}, previous: {} },
  loc_stats: {
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
  },
  loc_trends: {
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
      }
    },
    previous: {}
  }
};

const CARDS = [
  ['Change Time', ChangeTimeCard],
  ['Weekly Delivery Volume', WeeklyDeliveryVolumeCard],
  ['Change Failure Rate', ChangeFailureRateCard],
  ['Mean Time to Restore', MeanTimeToRestoreCard],
  ['Lines of Code', LinesOfCodeCard]
] as const;

// CLUSTOX: the real app theme, not a stub -- `benchmarkBandOptions` reads
// `theme.colors.success.main` off it, so a stub could pass here while the app
// threw on the same code path.
const renderCard = (name: string, Card: () => JSX.Element) => {
  currentCardName = name;
  return renderToStaticMarkup(
    <ThemeProvider theme={MainTheme}>
      <Card />
    </ThemeProvider>
  );
};

const optionsFor = (name: string) =>
  chartCalls.filter((call) => call.name === name).map((call) => call.options);

beforeEach(() => {
  chartCalls.length = 0;
  currentCardName = '';
  metricsSummary = { ...MEASURED_SUMMARY };
});

describe('with no benchmark configured anywhere', () => {
  it.each(CARDS)('%s renders without throwing', (name, Card) => {
    expect(() => renderCard(name, Card)).not.toThrow();
  });

  it.each(CARDS)('%s draws no target band', (name, Card) => {
    renderCard(name, Card);

    const optionsList = optionsFor(name);
    // Guards the assertion below: a card that rendered no chart at all would
    // vacuously have no annotations, and would not be proving anything.
    expect(optionsList.length).toBeGreaterThan(0);

    for (const options of optionsList) {
      expect(options.options.plugins.annotation).toBeUndefined();
      // The axis is untouched too. `suggestedMax` exists only to make room
      // for a target, so its presence means a band was sized in.
      expect(options.options.scales.y.suggestedMax).toBeUndefined();
    }
  });

  it.each(CARDS)('%s shows no benchmark caption', (name, Card) => {
    const html = renderCard(name, Card);

    // Every caption `benchmarkCaption` can produce contains "target (", and
    // every one names its source as a "benchmark". Neither wording can appear
    // when no target exists.
    //
    // CLUSTOX: this path is gated twice -- each card checks its benchmark
    // object before calling, and `benchmarkCaption` returns null for a null
    // target -- so no single-util mutation makes this assertion fire. Its
    // sensitivity comes from the control below, which asserts the very same
    // 'target (' string DOES appear once a benchmark is configured.
    expect(html).not.toContain('target (');
    expect(html).not.toContain('benchmark');
    // The specific way this breaks if a null target leaks into the caption.
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
  });

  it('leaves all four original cards on one shared, identical options object', () => {
    // CLUSTOX: reference equality, not deep equality. `useDoraCardChartOptions`
    // returns the module-level base constant untouched when there is no band,
    // so all four cards must come back with the very same object -- proof that
    // nothing was merged into the options on the no-target path, which no
    // structural assertion can give you.
    for (const [name, Card] of CARDS) renderCard(name, Card);

    const allOptions = chartCalls.map((call) => call.options);
    expect(allOptions.length).toBeGreaterThanOrEqual(4);
    for (const options of allOptions) {
      expect(options).toBe(allOptions[0]);
    }
  });

  it.each(CARDS)('%s still renders its measured numbers', (name, Card) => {
    // The guarantee is "unchanged", not "blank". A card that dropped its data
    // would satisfy every no-band assertion above.
    const html = renderCard(name, Card);
    expect(html).not.toContain('Insufficient data');
    expect(html.length).toBeGreaterThan(200);
  });
});

describe('control: a configured benchmark does reach the same cards', () => {
  // CLUSTOX: without this, every assertion above would still pass if the band
  // had been removed from the cards entirely, or if these renders were somehow
  // no longer reaching the real chart options. Same fixtures, targets added.
  const BENCHMARKS = {
    lead_time: { target: 72000, source: 'team' },
    deployment_frequency: { target: 5, source: 'team' },
    change_failure_rate: { target: 5, source: 'team' },
    mean_time_to_recovery: { target: 1800, source: 'team' },
    lines_of_code: { target: 200, source: 'team' }
  };

  it.each(CARDS)('%s draws a band and a caption', (name, Card) => {
    metricsSummary = { ...MEASURED_SUMMARY, benchmarks: BENCHMARKS };

    const html = renderCard(name, Card);

    const optionsList = optionsFor(name);
    expect(optionsList.length).toBeGreaterThan(0);
    for (const options of optionsList) {
      expect(options.options.plugins.annotation.annotations.band).toBeDefined();
    }
    expect(html).toContain('target (');
  });
});

describe('a target of zero is still a target', () => {
  // CLUSTOX: `0` is a real benchmark (zero failed changes), never "absent".
  // A truthiness check anywhere on the path from the payload to the band
  // would drop it and make the strictest target behave like no target at all
  // -- indistinguishable, on screen, from the regression this file guards.
  it('draws a band for a change failure rate target of 0', () => {
    metricsSummary = {
      ...MEASURED_SUMMARY,
      benchmarks: { change_failure_rate: { target: 0, source: 'team' } }
    };

    const html = renderCard('Change Failure Rate', ChangeFailureRateCard);

    const [options] = optionsFor('Change Failure Rate');
    expect(options.options.plugins.annotation.annotations.band).toBeDefined();
    expect(html).toContain('target (0%)');
  });
});

describe('no incidents this period is not a fast recovery', () => {
  // CLUSTOX: the mixed-period fixture. `isNoDataAvailable` is
  // `!incidents && !prevAvgTimeToRestore && !currAvgTimeToRestore`, so a team
  // with zero incidents THIS period but a recovery time LAST period does not
  // trip it -- the card takes its data-available branch with a null count.
  // `null <= target` is true in JS and `Math.round(null)` is 0, so the card
  // rendered a green "0s is under target" and a success-tinted band beside its
  // own "No incidents reported" headline. Nothing was recovered quickly; there
  // was nothing to recover.
  const MIXED_PERIOD = {
    current: { mean_time_to_recovery: null as number | null, incident_count: 0 },
    previous: { mean_time_to_recovery: 5400, incident_count: 4 }
  };

  it('shows no band, no caption and no comparison pill', () => {
    metricsSummary = {
      ...MEASURED_SUMMARY,
      mean_time_to_restore_stats: MIXED_PERIOD,
      benchmarks: {
        mean_time_to_recovery: { target: 3600, source: 'global' }
      }
    };

    const html = renderCard('Mean Time to Recovery', MeanTimeToRestoreCard);

    expect(html).not.toContain('under target');
    expect(html).not.toContain('over target');
    const [options] = optionsFor('Mean Time to Recovery');
    expect(options.options.plugins?.annotation).toBeUndefined();
  });

  it('still names the target, without claiming a verdict', () => {
    metricsSummary = {
      ...MEASURED_SUMMARY,
      mean_time_to_restore_stats: MIXED_PERIOD,
      benchmarks: {
        mean_time_to_recovery: { target: 3600, source: 'global' }
      }
    };

    // The grey target-only line used to live solely in the `!canShowMTRData`
    // branch, which this state never reaches -- so the one state that most
    // needs "a target exists, but nothing to compare" showed nothing at all.
    const html = renderCard('Mean Time to Recovery', MeanTimeToRestoreCard);

    // `toContain('target')` alone would be vacuous: the buggy caption
    // ("0s is under target (1h)") contains it too. The grey line reads
    // "target 1h"; the caption reads "target (1h)". Only the first matches.
    expect(html).toContain('target 1h');
    expect(html).not.toContain('under target');
  });
});
