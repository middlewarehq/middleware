// CLUSTOX: replaces BenchmarkTargetLine, a CSS-positioned div whose height was
// target / max(target, ...values). A deployment-frequency target of 1 against
// a series topping 35 landed at 3% -- visually identical to the card's bottom
// border -- while a lead-time target of 8h larger than every plotted value
// pinned to the top. Correct arithmetic, unreadable result, in both
// directions. An annotation is positioned in data space by chart.js itself, so
// it cannot disagree with the series it is drawn over.
//
// `chartjs-plugin-annotation` is already registered in
// `components/Chart2/InternalChart2.tsx`. The four DORA cards hide both axes
// (`display: false`); that does not affect annotations, which key off the
// scale rather than off a rendered axis.
//
// Kept import-light for the same reason `benchmarks.ts` is: `@/utils/date` and
// `@/theme/schemes/theme` both chain into modules that blow up ts-jest, so the
// theme tones are passed in by the caller and only their hex fallbacks are
// duplicated here.
import { BenchmarkMetric, LOWER_IS_BETTER } from '@/utils/benchmarks';

export type BenchmarkBandTone = 'success' | 'warning';

/**
 * The slice of the MUI theme this module needs. Structural, so the real
 * `useTheme()` result satisfies it without the util importing MUI.
 */
export type BenchmarkBandTheme = {
  colors: {
    success: { main: string };
    warning: { main: string };
  };
};

export type BenchmarkBandInput = {
  metric: BenchmarkMetric;
  /** The resolved benchmark target, in the same unit as `values`. */
  target: number | null | undefined;
  /** The headline value the card displays, used only to pick the tone. */
  actual: number;
  /** The same array the card's trend chart plots. */
  values: number[];
  theme?: BenchmarkBandTheme;
};

type BoxAnnotation = {
  type: 'box';
  yMin: number;
  yMax: number;
  backgroundColor: string;
  borderWidth: number;
  drawTime: string;
};

type LineAnnotation = {
  type: 'line';
  yMin: number;
  yMax: number;
  borderColor: string;
  borderWidth: number;
  borderDash: number[];
  drawTime: string;
};

export type BenchmarkBandOptions = {
  scales: { y: { suggestedMax: number } };
  plugins: {
    annotation: {
      annotations: {
        band: BoxAnnotation;
        targetLine: LineAnnotation;
      };
    };
  };
  // CLUSTOX: not a chart.js key -- chart.js ignores unknown option roots. It
  // rides along so the card that merges these options can also read the two
  // decisions made here without recomputing them: which tone the band was
  // drawn in, and whether the target had to be left off the axis (in which
  // case the caption is the only place the number appears).
  benchmarkBand: {
    tone: BenchmarkBandTone;
    targetIsOffScale: boolean;
    target: number;
  };
};

// CLUSTOX: mirrors `themeColors` in `@/theme/schemes/theme`, duplicated rather
// than imported because that module runs `createTheme` at import time and
// pulls all of MUI into any test that touches this one. Only reached when a
// caller omits `theme`; every card passes `useTheme()`.
const FALLBACK_TONE_COLORS: Record<BenchmarkBandTone, string> = {
  success: '#57CA22',
  warning: '#FFA319'
};

const BAND_OPACITY = 0.12;
const TARGET_LINE_OPACITY = 0.6;

// CLUSTOX: matches Chart2's own `grace: '10%'` headroom, so the band's top
// edge sits where the card's other charts already put their ceiling.
const AXIS_HEADROOM = 1.1;

// CLUSTOX: two opposite failures to avoid at once. Clamp the axis to the data
// and a target above it is clipped off-canvas, so the card looks exactly as it
// did before and the feature appears not to work. Extend the axis to the
// target unconditionally and a typo'd 20000-line target against a 200-line
// actual flattens the real series into a hairline at the bottom. So: include
// the target, but never stretch so far that the real series loses more than
// this share of the plot. Beyond that the axis stops, the band runs to the
// edge and the caption carries the number, because a scale nobody can read is
// worse than one that admits it is truncated.
//
// The value is 4 (the data keeps at least a quarter of the plot), NOT the 2
// the brief's prose names. 2 cannot satisfy the brief's own first test case:
// target 100 against values [10, 20, 30] needs the axis to reach 100, which is
// 3.33x the data max of 30, so a 2x cap would clip exactly the target the test
// requires to be visible. The two test cases bound this constant to roughly
// [3.4, 4.5); 4 sits in the middle of that window and states a rule that is
// easy to hold in your head.
const AXIS_STRETCH_LIMIT = 4;

const parseHex = (color: string): [number, number, number] | null => {
  const hex = color.trim().replace(/^#/, '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16)
  ];
};

// CLUSTOX: a local `alpha` rather than MUI's, to keep this module importable
// from a plain unit test. Handles the two forms the theme actually produces
// (hex, and the rgb/rgba that `alpha()` has already been applied to), and
// hands anything else back untouched -- an unrecognised colour should render
// opaque, not throw and take the whole chart down with it.
const withAlpha = (color: string, opacity: number): string => {
  const rgb = parseHex(color);
  if (rgb) return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;

  const parsed = color.match(/^rgba?\(([^)]+)\)$/i);
  if (parsed) {
    const [r, g, b] = parsed[1].split(',').map((part) => part.trim());
    if (r != null && g != null && b != null)
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  return color;
};

/**
 * Builds the chart.js options that draw a benchmark target as a shaded band
 * in the chart's own data space: a box covering the favourable side of the
 * target, a hairline at the target itself, and the `suggestedMax` needed to
 * keep both on canvas.
 *
 * Returns `null` when there is no target to draw -- the state every card is in
 * before anyone configures a benchmark.
 */
export const benchmarkBandOptions = ({
  metric,
  target,
  actual,
  values,
  theme
}: BenchmarkBandInput): BenchmarkBandOptions | null => {
  // CLUSTOX: `== null`, never truthiness. `0` is a real target -- zero failed
  // changes is the strictest benchmark there is, and the one a truthiness
  // check would silently drop.
  if (target == null || !Number.isFinite(target)) return null;

  const lowerIsBetter = LOWER_IS_BETTER.has(metric);

  // CLUSTOX: filter to finite numbers first. The Change Failure Rate series is
  // built from an optional-chained `head(...)?.data.map(...)`, so an
  // undefined/NaN entry is reachable, and one of those turns the axis max into
  // NaN -- which chart.js resolves by dropping the scale entirely.
  const dataMax = Math.max(0, ...values.filter((v) => Number.isFinite(v)));

  const stretchCeiling =
    dataMax > 0 ? dataMax * AXIS_STRETCH_LIMIT : Number.POSITIVE_INFINITY;
  const suggestedMax =
    Math.min(Math.max(dataMax, target, 0) * AXIS_HEADROOM, stretchCeiling) ||
    // CLUSTOX: an all-zero series with a target of 0 would otherwise ask
    // chart.js for a scale running 0 to 0.
    1;

  const targetIsOffScale = target > suggestedMax;

  // CLUSTOX: the direction is per metric. Deployment frequency is the one
  // metric in the set where the favourable side is *above* the target, so its
  // band runs target -> top of the axis while every other band runs
  // target -> 0. Getting this backwards silently reverses the feature's
  // meaning on exactly one card.
  const bandEdges = lowerIsBetter ? [0, target] : [target, suggestedMax];

  // CLUSTOX: `<=`/`>=` matches benchmarkCaption, so the band and the caption
  // printed directly under it can never disagree about which side of the
  // target a team is on.
  const onGoodSide = lowerIsBetter ? actual <= target : actual >= target;

  // CLUSTOX: never red -- a missed internal goal is not a system failure, and
  // colouring it like one makes the dashboard punitive (spec, "The graph").
  const tone: BenchmarkBandTone = onGoodSide ? 'success' : 'warning';
  const toneColor = theme
    ? theme.colors[tone].main
    : FALLBACK_TONE_COLORS[tone];

  return {
    scales: { y: { suggestedMax } },
    plugins: {
      annotation: {
        annotations: {
          band: {
            type: 'box',
            // CLUSTOX: sorted, so an unreachable deployment-frequency target
            // (band bottom above the axis top) still describes a real
            // interval for chart.js to clip rather than an inverted one.
            yMin: Math.min(...bandEdges),
            yMax: Math.max(...bandEdges),
            backgroundColor: withAlpha(toneColor, BAND_OPACITY),
            borderWidth: 0,
            // CLUSTOX: at the default draw time the box paints over the
            // series it is meant to sit behind.
            drawTime: 'beforeDatasetsDraw'
          },
          targetLine: {
            type: 'line',
            yMin: target,
            yMax: target,
            borderColor: withAlpha(toneColor, TARGET_LINE_OPACITY),
            borderWidth: 1,
            // CLUSTOX: dashed, carrying over the one thing the old CSS line
            // got right -- it reads as a goal rather than as data.
            borderDash: [4, 4],
            drawTime: 'beforeDatasetsDraw'
          }
        }
      }
    },
    benchmarkBand: { tone, targetIsOffScale, target }
  };
};
