// CLUSTOX: everything the Lines of Code card needs, derived in one pure
// function so the two states that matter can be asserted without rendering
// MUI: `loc_stats` present (real numbers reach the card) and `loc_stats`
// absent (an older backend behind this frontend, which must degrade rather
// than throw).
//
// Kept dependency-light for the same reason `benchmarks.ts` and
// `benchmarkBand.ts` are: `@/utils/date` -- the obvious place to borrow
// `getSortedDatesAsArrayFromMap` from -- chains into `@/utils/mock` ->
// `@faker-js/faker`, whose ESM-only output blows up ts-jest the instant it is
// required. The week sort is reimplemented below rather than imported, and is
// character-for-character the same comparator.
//
// The two `import type` lines are erased at compile time, so this module still
// pulls in nothing at runtime.
import type { LOCApiResponse, LOCTrendsApiResponse } from '@/types/resources';

export type LocStats = {
  current: LOCApiResponse;
  previous: LOCApiResponse;
};

export type LocTrends = {
  current: LOCTrendsApiResponse;
  previous: LOCTrendsApiResponse;
};

export type LocCardModel = {
  /**
   * Whether LOC was measured at all. `false` means the response carried no
   * `loc_stats` -- not that the team changed nothing, which arrives as a real
   * `{ additions: 0, ... }` and leaves this `true`.
   */
  isMeasured: boolean;
  additions: number;
  deletions: number;
  /** additions + deletions over the whole selected range. */
  total: number;
  /**
   * Gross lines per calendar day -- the card's headline figure.
   *
   * The headline is a rate rather than `total` because a total is not
   * comparable between two ranges of different lengths: the same pace of work
   * reads four times "better" over a month than over a week. Computed in the
   * backend, where the interval is known, rather than re-derived here from a
   * day count the card would have to guess.
   */
  avgDaily: number;
  /** Average gross lines per merged PR -- the benchmarked figure. */
  avgPrSize: number;
  prevTotal: number;
  prevAvgDaily: number;
  prevAvgPrSize: number;
  /**
   * The weekly average-PR-size series, oldest week first.
   *
   * This is the ONLY series the benchmark band may be drawn over. The band's
   * `yMin`/`yMax`/`suggestedMax` are in the plotted chart's own data space, so
   * pairing a target in lines-per-PR (~200) with a series of weekly totals
   * (~70,000) would draw a band that is arithmetically correct and visually a
   * hairline on the axis floor -- a plausible wrong answer nobody questions.
   */
  avgPrSizeValues: number[];
  /** ISO week keys for `avgPrSizeValues`, same order -- tooltip titles. */
  weeks: string[];
  /**
   * Whether average PR size can be compared against a target at all.
   *
   * False when nothing was merged: `avg_pr_size` is 0 there (the backend
   * returns 0 rather than dividing by zero), and 0 beats every lower-is-better
   * target, so a team that shipped nothing would be congratulated for it. Same
   * trap the Change Failure Rate card hits with no deployments.
   */
  canComparePrSize: boolean;
};

const EMPTY_MODEL: LocCardModel = {
  isMeasured: false,
  additions: 0,
  deletions: 0,
  total: 0,
  avgDaily: 0,
  avgPrSize: 0,
  prevTotal: 0,
  prevAvgDaily: 0,
  prevAvgPrSize: 0,
  avgPrSizeValues: [],
  weeks: [],
  canComparePrSize: false
};

// CLUSTOX: an explicit absence check, never `value || 0`. The four LOC fields
// are always numbers on the wire, so this only ever substitutes for a
// malformed payload -- but `||` would also rewrite a genuine measured 0, which
// is the one value this whole card has to keep distinguishable from "absent".
// Returns 0 for a number that is not finite too, since NaN in the plotted
// series makes chart.js drop the whole y scale (see benchmarkBand.ts).
const num = (value: number | undefined | null): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const sortedWeeks = (
  trends: LOCTrendsApiResponse | undefined | null
): string[] =>
  Object.keys(trends || {}).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

/**
 * Builds the Lines of Code card's view model.
 *
 * Both arguments are optional on `TeamDoraMetricsApiResponseType` -- the BFF
 * route degrades them to `undefined` rather than failing the whole response --
 * so every field access here tolerates `undefined` at any depth.
 */
export const buildLocCardModel = (
  locStats: LocStats | undefined | null,
  locTrends: LocTrends | undefined | null
): LocCardModel => {
  const current = locStats?.current;

  // CLUSTOX: the old-backend case. Returning a fully-formed zero model rather
  // than nulls means the card's JSX reads the same fields in both states and
  // cannot crash on one of them; `isMeasured` is what the card branches on.
  if (current == null) return EMPTY_MODEL;

  const previous = locStats?.previous;

  // CLUSTOX: current and previous trend buckets are keyed by week start and
  // cover disjoint periods, so this is a union, not an overwrite -- the same
  // `merge(current, previous)` the Lead Time card does, spelled out to keep
  // this module import-free.
  const mergedTrends = { ...locTrends?.current, ...locTrends?.previous };

  const total = num(current.total);
  const weeks = sortedWeeks(mergedTrends);

  return {
    isMeasured: true,
    additions: num(current.additions),
    deletions: num(current.deletions),
    total,
    avgDaily: num(current.avg_daily),
    avgPrSize: num(current.avg_pr_size),
    prevTotal: num(previous?.total),
    prevAvgDaily: num(previous?.avg_daily),
    prevAvgPrSize: num(previous?.avg_pr_size),
    weeks,
    avgPrSizeValues: weeks.map((week) => num(mergedTrends[week]?.avg_pr_size)),
    // CLUSTOX: `> 0` is a real numeric predicate here, not an absence check --
    // zero lines changed genuinely means there is no PR size to benchmark.
    canComparePrSize: total > 0
  };
};
