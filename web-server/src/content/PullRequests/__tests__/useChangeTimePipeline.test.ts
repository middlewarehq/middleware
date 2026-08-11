jest.mock('@/store', () => ({ useSelector: jest.fn() }));

import { renderHook } from '@testing-library/react';

import { useSelector } from '@/store';

import { useLeadTimePipeline } from '../useChangeTimePipeline';

// CLUSTOX: regression test for a real crash found live -- metrics_summary
// is null until fetchTeamDoraMetrics resolves (see the dora_metrics
// redux slice's initialState), and useLeadTimePipeline read
// .lead_time_stats off it with no guard. Every sibling read of
// metrics_summary elsewhere in this codebase already uses
// metrics_summary?.field -- this hook was the one exception, and it
// only stayed hidden because its only prior caller (LeadTimeStatsCore,
// via usePrChangeTimePipeline) always mounted after the fetch had
// already resolved. LeadTimeBreakdownCard mounting it inline, on the
// same page as the fetch itself, hit the null window immediately and
// blanked the whole page.
describe('useLeadTimePipeline', () => {
  it('does not throw and returns zeroed segments when metrics_summary is null', () => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({ doraMetrics: { metrics_summary: null } })
    );

    const { result } = renderHook(() => useLeadTimePipeline());

    expect(result.current.totalLeadTime).toBe(0);
    expect(result.current.leadTimeDetailsArray.every((s) => s.duration === 0)).toBe(
      true
    );
  });

  it('reads the real averages once metrics_summary is populated', () => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        doraMetrics: {
          metrics_summary: {
            lead_time_stats: {
              current: {
                first_commit_to_open: 100,
                first_response_time: 200,
                rework_time: 300,
                merge_time: 400,
                merge_to_deploy: 500
              }
            }
          }
        }
      })
    );

    const { result } = renderHook(() => useLeadTimePipeline());

    expect(result.current.totalLeadTime).toBe(1500);
    expect(result.current.leadTimeDetailsArray.map((s) => s.duration)).toEqual([
      100, 200, 300, 400, 500
    ]);
  });
});
