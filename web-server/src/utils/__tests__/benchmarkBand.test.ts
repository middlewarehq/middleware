import {
  benchmarkBandOptions,
  BenchmarkBandInput,
  BenchmarkBandOptions
} from '../benchmarkBand';

// CLUSTOX: `benchmarkBandOptions` returns null for an absent target, which is
// a state none of these cases exercise. Unwrapping here keeps every assertion
// below identical to the spec's without sprinkling `!` through the file.
const bandOptions = (input: BenchmarkBandInput): BenchmarkBandOptions => {
  const opts = benchmarkBandOptions(input);
  if (opts == null) throw new Error('expected band options, got null');
  return opts;
};

const boxOf = (opts: BenchmarkBandOptions) =>
  opts.plugins.annotation.annotations.band;

const lineOf = (opts: BenchmarkBandOptions) =>
  opts.plugins.annotation.annotations.targetLine;

// CLUSTOX: asserts on the tone *token*, not on the resolved rgba string. The
// rgba string is whatever theme fixture the test hands in, so matching it
// would only restate the fixture; the token is the decision under test. That
// the token is what actually reaches the canvas is covered separately by
// 'derives the band colours from the theme tone'.
const colorOf = (opts: BenchmarkBandOptions) => opts.benchmarkBand.tone;

const theme = {
  colors: {
    success: { main: '#57CA22' },
    warning: { main: '#FFA319' }
  }
};

describe('benchmarkBandOptions', () => {
  it('extends the y scale so a target above the data is not clipped', () => {
    const opts = bandOptions({
      metric: 'lead_time',
      target: 100,
      actual: 20,
      values: [10, 20, 30]
    });
    // Without this the band is drawn off-canvas and the card looks unchanged.
    expect(opts.scales.y.suggestedMax).toBeGreaterThanOrEqual(100);
  });

  it('refuses to stretch the axis more than the limit past the data', () => {
    // A fat-fingered target must not flatten the real series into a hairline.
    const opts = bandOptions({
      metric: 'lines_of_code',
      target: 20000,
      actual: 200,
      values: [180, 200, 220]
    });
    expect(opts.scales.y.suggestedMax).toBeLessThan(1000);
  });

  it('reports a target it could not fit on the axis', () => {
    // The caption has to carry the number when the band runs off the edge.
    const fits = bandOptions({
      metric: 'lead_time',
      target: 100,
      actual: 20,
      values: [10, 20, 30]
    });
    const doesNotFit = bandOptions({
      metric: 'lines_of_code',
      target: 20000,
      actual: 200,
      values: [180, 200, 220]
    });
    expect(fits.benchmarkBand.targetIsOffScale).toBe(false);
    expect(doesNotFit.benchmarkBand.targetIsOffScale).toBe(true);
  });

  it('keeps a usable band when a higher-is-better target is off scale', () => {
    // CLUSTOX: the off-scale cases above are all lower-is-better, where the
    // band runs [0, target] and a clipped target only shortens it. Deployment
    // frequency runs [target, suggestedMax], so an off-scale target is the one
    // direction where the two edges can cross and produce an inverted --
    // therefore invisible -- box. Everything else about this feature can look
    // right while that one card silently draws nothing.
    const opts = bandOptions({
      metric: 'deployment_frequency',
      target: 900,
      actual: 5,
      values: [4, 5, 6]
    });
    const { yMin, yMax } = boxOf(opts);
    expect(opts.benchmarkBand.targetIsOffScale).toBe(true);
    expect(yMax).toBeGreaterThanOrEqual(yMin);
    expect(colorOf(opts)).toBe('warning');
  });

  it('covers target down to zero when lower is better', () => {
    const { yMin, yMax } = boxOf(
      bandOptions({
        metric: 'lead_time',
        target: 100,
        actual: 20,
        values: [10, 20, 30]
      })
    );
    expect(yMin).toBe(0);
    expect(yMax).toBe(100);
  });

  it('covers target upward for deployment frequency', () => {
    const { yMin } = boxOf(
      bandOptions({
        metric: 'deployment_frequency',
        target: 5,
        actual: 9,
        values: [4, 9]
      })
    );
    expect(yMin).toBe(5);
  });

  it('shades the whole plot for a deployment-frequency target under the data', () => {
    // The bug this replaces: target 1/week against a series topping 35 put a
    // CSS-positioned line at 3% of the card, indistinguishable from its
    // bottom border. In data space the good region is nearly the whole plot.
    const { yMin, yMax } = boxOf(
      bandOptions({
        metric: 'deployment_frequency',
        target: 1,
        actual: 30,
        values: [12, 35, 30]
      })
    );
    expect(yMin).toBe(1);
    expect(yMax).toBeGreaterThanOrEqual(35);
  });

  it('tints success when the actual value is on the good side', () => {
    const opts = bandOptions({
      metric: 'lead_time',
      target: 100,
      actual: 20,
      values: [20]
    });
    expect(colorOf(opts)).toMatch(/success/);
  });

  it('never returns red', () => {
    const opts = bandOptions({
      metric: 'lead_time',
      target: 10,
      actual: 900,
      values: [900]
    });
    expect(colorOf(opts)).not.toMatch(/error|red/);
  });

  it('counts hitting the target exactly as the good side', () => {
    // Matches benchmarkCaption's `<=`/`>=`, so the band and the caption under
    // it can never disagree about which side of the target a team is on.
    expect(
      colorOf(
        bandOptions({
          metric: 'lead_time',
          target: 100,
          actual: 100,
          values: [100]
        })
      )
    ).toBe('success');
    expect(
      colorOf(
        bandOptions({
          metric: 'deployment_frequency',
          target: 5,
          actual: 5,
          values: [5]
        })
      )
    ).toBe('success');
  });

  it('inverts the good side for deployment frequency', () => {
    // Same numbers, opposite verdicts. Getting the direction backwards is
    // invisible on any single card.
    expect(
      colorOf(
        bandOptions({
          metric: 'deployment_frequency',
          target: 10,
          actual: 2,
          values: [2]
        })
      )
    ).toBe('warning');
    expect(
      colorOf(
        bandOptions({
          metric: 'lead_time',
          target: 10,
          actual: 2,
          values: [2]
        })
      )
    ).toBe('success');
  });

  it('derives the band colours from the theme tone', () => {
    const opts = bandOptions({
      metric: 'lead_time',
      target: 100,
      actual: 20,
      values: [10, 20, 30],
      theme
    });
    // 87/202/34 is #57CA22, the theme's success main.
    expect(boxOf(opts).backgroundColor).toBe('rgba(87, 202, 34, 0.12)');
    expect(lineOf(opts).borderColor).toBe('rgba(87, 202, 34, 0.6)');
  });

  it('draws the band behind the series, not over it', () => {
    // A box drawn at the default draw time paints on top of the line it is
    // meant to sit behind.
    expect(
      boxOf(
        bandOptions({
          metric: 'lead_time',
          target: 100,
          actual: 20,
          values: [10, 20, 30]
        })
      ).drawTime
    ).toBe('beforeDatasetsDraw');
  });

  it('marks the target itself with a line at the target value', () => {
    const line = lineOf(
      bandOptions({
        metric: 'mean_time_to_recovery',
        target: 3600,
        actual: 1800,
        values: [1200, 1800]
      })
    );
    expect(line.yMin).toBe(3600);
    expect(line.yMax).toBe(3600);
  });

  it('treats a target of zero as a real target, not an absent one', () => {
    // `0` is a legitimate benchmark (zero failed changes). Any truthiness
    // check here silently drops the band for the strictest target there is.
    const opts = bandOptions({
      metric: 'change_failure_rate',
      target: 0,
      actual: 0,
      values: [0, 2, 4]
    });
    expect(boxOf(opts).yMax).toBe(0);
    expect(colorOf(opts)).toBe('success');
  });

  it('returns null when there is no target to draw', () => {
    expect(
      benchmarkBandOptions({
        metric: 'lead_time',
        target: null,
        actual: 20,
        values: [10, 20, 30]
      })
    ).toBeNull();
    expect(
      benchmarkBandOptions({
        metric: 'lead_time',
        target: undefined,
        actual: 20,
        values: [10, 20, 30]
      })
    ).toBeNull();
  });

  it('survives a series with no usable numbers', () => {
    // The Change Failure Rate series is built from an optional-chained
    // `head(...)?.data.map(...)`, so undefined/NaN entries are reachable. One
    // of them turning the axis max into NaN would take the whole chart down.
    const opts = bandOptions({
      metric: 'change_failure_rate',
      target: 15,
      actual: 20,
      values: [NaN, undefined, null] as unknown as number[]
    });
    expect(Number.isFinite(opts.scales.y.suggestedMax)).toBe(true);
    expect(opts.scales.y.suggestedMax).toBeGreaterThan(0);
  });

  it('never produces a zero-height axis', () => {
    // A target of 0 with an all-zero series would otherwise ask chart.js for
    // a scale running 0 to 0.
    const opts = bandOptions({
      metric: 'change_failure_rate',
      target: 0,
      actual: 0,
      values: [0, 0]
    });
    expect(opts.scales.y.suggestedMax).toBeGreaterThan(0);
  });
});
