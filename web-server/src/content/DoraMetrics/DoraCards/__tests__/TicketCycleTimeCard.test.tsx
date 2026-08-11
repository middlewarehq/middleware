jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/useStateTeamConfig', () => ({
  useSingleTeamConfig: jest.fn()
}));
jest.mock('axios');

import { screen, waitFor } from '@testing-library/react';
import axios from 'axios';

import { useAuth } from '@/hooks/useAuth';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { renderWithTheme as render } from '@/utils/testUtils';

import { TicketCycleTimeCard } from '../TicketCycleTimeCard';

const TEAM_ID = 'team-1';

// CLUSTOX: Jira integration, Phase 4 (§6C/§6E). See
// docs/JIRA_INTEGRATION_PROPOSAL.md.
describe('TicketCycleTimeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSingleTeamConfig as jest.Mock).mockReturnValue({
      singleTeamId: TEAM_ID,
      dates: { start: new Date('2026-05-01'), end: new Date('2026-08-01') }
    });
  });

  it('renders nothing when Jira is not linked for this org', () => {
    (useAuth as jest.Mock).mockReturnValue({ integrations: {} });
    const { container } = render(<TicketCycleTimeCard />);

    expect(container).toBeEmptyDOMElement();
    expect(axios).not.toHaveBeenCalled();
  });

  it('renders nothing when there is no team selected yet', () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (useSingleTeamConfig as jest.Mock).mockReturnValue({
      singleTeamId: undefined,
      dates: { start: new Date(), end: new Date() }
    });
    const { container } = render(<TicketCycleTimeCard />);

    expect(container).toBeEmptyDOMElement();
    expect(axios).not.toHaveBeenCalled();
  });

  it('renders nothing when the team has no ticket data for this period', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: { cycle_time_by_status: [], ticket_count: 0, prs_without_ticket_count: 0 }
    });
    const { container } = render(<TicketCycleTimeCard />);

    await waitFor(() => expect(axios).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each status sorted by longest average time first', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: {
        cycle_time_by_status: [
          { status: 'In Progress', avg_seconds: 3600, ticket_count: 5 },
          { status: 'To Do', avg_seconds: 864000, ticket_count: 10 }
        ],
        ticket_count: 15,
        prs_without_ticket_count: 0
      }
    });
    render(<TicketCycleTimeCard />);

    await screen.findByText('Ticket Cycle Time');
    const rows = screen.getAllByText(/To Do|In Progress/);
    expect(rows[0]).toHaveTextContent('To Do');
    expect(rows[1]).toHaveTextContent('In Progress');
  });

  it('shows the data-hygiene callout only when there are unlinked merged PRs', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: {
        cycle_time_by_status: [
          { status: 'Done', avg_seconds: 3600, ticket_count: 1 }
        ],
        ticket_count: 1,
        prs_without_ticket_count: 4
      }
    });
    render(<TicketCycleTimeCard />);

    expect(
      await screen.findByText(/4 PRs merged this period with no linked Jira ticket/)
    ).toBeInTheDocument();
  });

  it('omits the data-hygiene callout when every merged PR is linked', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: {
        cycle_time_by_status: [
          { status: 'Done', avg_seconds: 3600, ticket_count: 1 }
        ],
        ticket_count: 1,
        prs_without_ticket_count: 0
      }
    });
    render(<TicketCycleTimeCard />);

    await screen.findByText('Ticket Cycle Time');
    expect(screen.queryByText(/no linked Jira ticket/)).not.toBeInTheDocument();
  });
});
