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

const project = (overrides = {}) => ({
  project_key: 'PZDA',
  project_name: 'Project Zero Deposit Africa',
  ticket_count: 222,
  avg_total_seconds: 1128947,
  avg_seconds_by_category: {
    'To Do': 495562,
    'In Progress': 631158,
    Done: 2227
  },
  ...overrides
});

// CLUSTOX: Jira integration, Phase 4 (§6C/§6E). See
// docs/JIRA_INTEGRATION_PROPOSAL.md. One fetch backs two visually
// separate cards (Ticket Cycle Time, Data Hygiene) -- see the
// "fetches ticket insights exactly once" test below for why that
// matters (avoiding a duplicate network call for the same data).
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

  it('renders nothing when no project has ticket data for this period', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: { cycle_time_by_project: [], prs_without_ticket_count: 0 }
    });
    const { container } = render(<TicketCycleTimeCard />);

    await waitFor(() => expect(axios).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('fetches ticket insights exactly once, for both cards combined', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: {
        cycle_time_by_project: [project()],
        prs_without_ticket_count: 5
      }
    });
    render(<TicketCycleTimeCard />);

    await screen.findByText('Ticket Cycle Time');
    await screen.findByText('Data Hygiene');
    expect(axios).toHaveBeenCalledTimes(1);
  });

  it('renders one row per tracked project, with its own key, name, and avg', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: {
        cycle_time_by_project: [
          project({ project_key: 'PZDA', avg_total_seconds: 1128947 }),
          project({
            project_key: 'PAY',
            project_name: 'Payments',
            avg_total_seconds: 86400
          })
        ],
        prs_without_ticket_count: 0
      }
    });
    render(<TicketCycleTimeCard />);

    expect(await screen.findByText('PZDA')).toBeInTheDocument();
    expect(screen.getByText('PAY')).toBeInTheDocument();
    expect(screen.getByText(/Payments/)).toBeInTheDocument();
  });

  it('shows the Data Hygiene card only when there are unlinked merged PRs', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: { cycle_time_by_project: [project()], prs_without_ticket_count: 4 }
    });
    render(<TicketCycleTimeCard />);

    expect(await screen.findByText('Data Hygiene')).toBeInTheDocument();
    expect(
      screen.getByText(/PRs merged this period with no linked Jira ticket/)
    ).toBeInTheDocument();
  });

  it('omits the Data Hygiene card entirely when every merged PR is linked', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: { cycle_time_by_project: [project()], prs_without_ticket_count: 0 }
    });
    render(<TicketCycleTimeCard />);

    await screen.findByText('Ticket Cycle Time');
    expect(screen.queryByText('Data Hygiene')).not.toBeInTheDocument();
  });
});
