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
