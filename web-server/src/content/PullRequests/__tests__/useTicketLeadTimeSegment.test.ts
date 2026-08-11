jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/useStateTeamConfig', () => ({
  useSingleTeamConfig: jest.fn()
}));
jest.mock('axios');

import { renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';

import { useAuth } from '@/hooks/useAuth';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';

import { useTicketLeadTimeSegment } from '../useTicketLeadTimeSegment';

const TEAM_ID = 'team-1';
const DATES = { start: new Date('2026-05-01'), end: new Date('2026-08-01') };

// CLUSTOX: Jira integration -- the extended Lead Time breakdown's
// leading "ticket created -> first commit" segment (docs/
// JIRA_INTEGRATION_PROPOSAL.md §6A).
describe('useTicketLeadTimeSegment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSingleTeamConfig as jest.Mock).mockReturnValue({
      singleTeamId: TEAM_ID,
      dates: DATES
    });
  });

  it('returns nulls and never fetches when Jira is not linked', () => {
    (useAuth as jest.Mock).mockReturnValue({ integrations: {} });

    const { result } = renderHook(() => useTicketLeadTimeSegment());

    expect(result.current).toEqual({ ticketSegment: null, comparison: null });
    expect(axios).not.toHaveBeenCalled();
  });

  it('returns nulls and never fetches when no team is selected', () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (useSingleTeamConfig as jest.Mock).mockReturnValue({
      singleTeamId: undefined,
      dates: DATES
    });

    const { result } = renderHook(() => useTicketLeadTimeSegment());

    expect(result.current).toEqual({ ticketSegment: null, comparison: null });
    expect(axios).not.toHaveBeenCalled();
  });

  it('returns nulls when there are no ticket-matched PRs this period, even with real data returned', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: {
        matched_pr_count: 0,
        avg_ticket_to_first_commit_seconds: 0,
        avg_commit_only_lead_time_seconds: 0,
        avg_extended_lead_time_seconds: 0
      }
    });

    const { result } = renderHook(() => useTicketLeadTimeSegment());

    await waitFor(() => expect(axios).toHaveBeenCalled());
    expect(result.current).toEqual({ ticketSegment: null, comparison: null });
  });

  it('maps a real response to a segment and comparison, unrounded fields preserved', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: {
        matched_pr_count: 200,
        avg_ticket_to_first_commit_seconds: 759519,
        avg_commit_only_lead_time_seconds: 12853,
        avg_extended_lead_time_seconds: 772372
      }
    });

    const { result } = renderHook(() => useTicketLeadTimeSegment());

    await waitFor(() => expect(result.current.ticketSegment).not.toBeNull());

    expect(result.current.ticketSegment.duration).toBe(759519);
    expect(result.current.ticketSegment.title).toBe('Idea');
    // Full design-reference phase name + the "New" pill flag, for
    // LeadTimeStatsCore's legend-mode rendering.
    expect(result.current.ticketSegment.legendLabel).toBe(
      'Ticket created → first commit'
    );
    expect(result.current.ticketSegment.isNew).toBe(true);
    expect(result.current.comparison).toEqual({
      extendedSeconds: 772372,
      commitOnlySeconds: 12853,
      matchedPrCount: 200
    });
  });

  it('fetches with isoDateString-formatted dates, scoped to the selected team', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: {
        matched_pr_count: 1,
        avg_ticket_to_first_commit_seconds: 100,
        avg_commit_only_lead_time_seconds: 50,
        avg_extended_lead_time_seconds: 150
      }
    });

    renderHook(() => useTicketLeadTimeSegment());

    await waitFor(() =>
      expect(axios).toHaveBeenCalledWith(
        `/api/internal/team/${TEAM_ID}/ticket_lead_time`,
        {
          params: {
            from_date: DATES.start.toISOString(),
            to_date: DATES.end.toISOString()
          }
        }
      )
    );
  });
});
