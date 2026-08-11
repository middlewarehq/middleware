// CLUSTOX: per-team DORA benchmarks -- the caption shown under a metric card
// when a target (team-set or org-wide default) exists for it.
//
// Deliberately dependency-light (no imports at all) so `benchmarkCaption` is
// unit testable in isolation. `@/utils/date` -- the obvious place to borrow a
// duration formatter from -- chains into `@/utils/mock` -> `@faker-js/faker`,
// which ships ESM-only output and blows up ts-jest with "Cannot use import
// statement outside a module" the instant it's required (verified directly:
// a probe test importing `getDurationString` fails with that exact error).
// `contributorFilters.ts` hit the same wall for the same reason; this file
// stays equally self-contained.
export type BenchmarkMetric =
  | 'lead_time'
  | 'deployment_frequency'
  | 'change_failure_rate'
  | 'mean_time_to_recovery';

export type BenchmarkSource = 'team' | 'global' | null;

export type ResolvedBenchmark = {
  target: number | null;
  source: BenchmarkSource;
};

export type Benchmarks = Record<BenchmarkMetric, ResolvedBenchmark>;

export type BenchmarkTone = 'good' | 'warn';

export type BenchmarkCaption = {
  text: string;
  tone: BenchmarkTone;
};

// CLUSTOX: direction is per metric, not global. Lead time, change failure
// rate and MTTR are all "smaller is better" -- deployment frequency is the
// one metric in the set where "smaller is better" is exactly backwards.
// Getting this list wrong silently inverts the whole feature's meaning, so
// it's the one thing under direct test coverage (see benchmarks.test.ts).
const LOWER_IS_BETTER: ReadonlySet<BenchmarkMetric> = new Set([
  'lead_time',
  'change_failure_rate',
  'mean_time_to_recovery'
]);

const formatDuration = (seconds: number): string => {
  const abs = Math.abs(seconds);
  if (abs < 60) return `${Math.round(seconds)}s`;
  if (abs < 3600) return `${Math.round(seconds / 60)}m`;
  if (abs < 86400) return `${Math.round((seconds / 3600) * 10) / 10}h`;
  return `${Math.round((seconds / 86400) * 10) / 10}d`;
};

const formatBenchmarkValue = (
  metric: BenchmarkMetric,
  value: number
): string => {
  switch (metric) {
    case 'lead_time':
    case 'mean_time_to_recovery':
      return formatDuration(value);
    case 'change_failure_rate':
      return `${value}%`;
    case 'deployment_frequency':
      return `${value} ${value === 1 ? 'deployment' : 'deployments'}/week`;
  }
};

/**
 * Compares `actual` against `target` for `metric` and returns a caption
 * stating the fact (over/under/above/below target) plus which side of the
 * target is favourable for this particular metric.
 *
 * Returns `null` when there is no target to compare against -- that is the
 * state every card is in before anyone configures a benchmark, and it must
 * render nothing rather than a caption about a target that doesn't exist.
 */
export const benchmarkCaption = (
  metric: BenchmarkMetric,
  actual: number,
  target: number | null,
  source: BenchmarkSource
): BenchmarkCaption | null => {
  if (target === null) return null;

  const lowerIsBetter = LOWER_IS_BETTER.has(metric);
  // CLUSTOX: `<=`/`>=` so hitting the target exactly reads as "good", not as
  // a coin flip between the two tones.
  const favourable = lowerIsBetter ? actual <= target : actual >= target;

  let direction: string;
  if (actual === target) {
    direction = 'at';
  } else if (lowerIsBetter) {
    direction = actual < target ? 'under' : 'over';
  } else {
    direction = actual > target ? 'above' : 'below';
  }

  // CLUSTOX: names which benchmark applied so a team that set a target but
  // sees the org-wide default knows their setting didn't save, rather than
  // silently comparing against the wrong number.
  const sourceClause =
    source === 'team' ? "your team's benchmark" : 'the default benchmark';

  const text = `${formatBenchmarkValue(
    metric,
    actual
  )} is ${direction} target (${formatBenchmarkValue(
    metric,
    target
  )}) — ${sourceClause}`;

  return {
    text,
    // CLUSTOX: never 'error'/red -- a missed internal goal isn't a system
    // failure, and colouring it like one makes the dashboard punitive.
    tone: favourable ? 'good' : 'warn'
  };
};
