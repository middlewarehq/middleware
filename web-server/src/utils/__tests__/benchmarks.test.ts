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
