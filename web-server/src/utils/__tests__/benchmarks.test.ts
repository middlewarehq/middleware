import { benchmarkCaption } from '../benchmarks';

describe('benchmarkCaption', () => {
  it('treats being under target as good for lead time', () => {
    const r = benchmarkCaption('lead_time', 3600, 7200, 'team');
    expect(r.tone).toBe('good');
    expect(r.text).toContain('under target');
  });

  it('treats being under target as bad for deployment frequency', () => {
    // Higher is better here -- the same direction means the opposite thing.
    const r = benchmarkCaption('deployment_frequency', 2, 5, 'team');
    expect(r.tone).toBe('warn');
    expect(r.text).toContain('below target');
  });

  it('treats being under target as good for CFR and MTTR too', () => {
    // The other two members of LOWER_IS_BETTER. Deployment frequency is the
    // single metric in the set where the direction inverts, so an entry
    // wrongly added to or dropped from that set would silently reverse the
    // meaning of a card with nothing else to catch it.
    expect(benchmarkCaption('change_failure_rate', 5, 15, 'team').tone).toBe(
      'good'
    );
    expect(
      benchmarkCaption('mean_time_to_recovery', 900, 3600, 'team').tone
    ).toBe('good');
  });

  it('treats a smaller average PR as good, and reports it in lines', () => {
    // Lower is better: small PRs review faster and merge sooner. And the
    // unit is lines, not seconds -- 150 must not render as "2.5m".
    const r = benchmarkCaption('lines_of_code', 150, 200, 'team');
    expect(r.tone).toBe('good');
    expect(r.text).toContain('150 lines');
    expect(r.text).toContain('under target (200 lines)');
  });

  it('treats a target of zero lines as a real target', () => {
    // `0` is a deliberate target, never "absent" -- a truthiness check here
    // would drop the caption entirely.
    expect(benchmarkCaption('lines_of_code', 10, 0, 'team')).not.toBeNull();
    expect(benchmarkCaption('lines_of_code', 10, 0, 'team').tone).toBe('warn');
  });

  it('names the source so a team can see its setting did not save', () => {
    expect(benchmarkCaption('lead_time', 3600, 7200, 'global').text).toContain(
      'default'
    );
    expect(benchmarkCaption('lead_time', 3600, 7200, 'team').text).toContain(
      'team'
    );
  });

  it('returns null when there is no target', () => {
    expect(benchmarkCaption('lead_time', 3600, null, null)).toBeNull();
  });
});

describe('benchmarkCaption headline', () => {
  it('leads with the gap as a percentage', () => {
    // Shahzad's own example: 1.2d actual vs 2.1d target. The sentence form
    // makes the reader do this subtraction; the headline does it for them.
    const r = benchmarkCaption('lead_time', 103680, 181440, 'team');
    expect(r.headline).toBe('43% under target');
    expect(r.sourceShort).toBe('team benchmark');
  });

  it('switches to a multiplier once the gap passes 2x', () => {
    // 5/week against a 1/week target: "400% above target" is the same number
    // and nobody parses it.
    const r = benchmarkCaption('deployment_frequency', 5, 1, 'global');
    expect(r.headline).toBe('5x above target');
    expect(r.tone).toBe('good');
  });

  it('falls back to the absolute value when the target is 0', () => {
    // A CFR target of 0 is legitimate and makes a percentage undefined.
    const r = benchmarkCaption('change_failure_rate', 2.5, 0, 'team');
    expect(r.headline).toBe('2.5% over target');
    expect(r.tone).toBe('warn');
  });

  it('says on target when the target is met exactly', () => {
    const r = benchmarkCaption('change_failure_rate', 0, 0, 'team');
    expect(r.headline).toBe('on target');
    expect(r.tone).toBe('good');
  });
});
