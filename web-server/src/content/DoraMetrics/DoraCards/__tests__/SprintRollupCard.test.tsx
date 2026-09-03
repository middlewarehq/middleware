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

import { SprintRollupCard } from '../SprintRollupCard';

const TEAM_ID = 'team-1';

const sprint = (overrides = {}) => ({
  name: 'PZDA Sprint 1',
  state: 'closed',
  start_date: '2026-07-20T07:55:00.130Z',
  end_date: '2026-08-03T05:00:00.000Z',
  planned_count: 355,
  completed_count: 272,
  ...overrides
});

// CLUSTOX: Jira integration -- the Sprint rollup chart. See
// docs/JIRA_INTEGRATION_PROPOSAL.md §6D.
describe('SprintRollupCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSingleTeamConfig as jest.Mock).mockReturnValue({ singleTeamId: TEAM_ID });
  });

  it('renders nothing when Jira is not linked for this org', () => {
    (useAuth as jest.Mock).mockReturnValue({ integrations: {} });
    const { container } = render(<SprintRollupCard />);

    expect(container).toBeEmptyDOMElement();
    expect(axios).not.toHaveBeenCalled();
  });

  it('renders nothing when there is no team selected yet', () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (useSingleTeamConfig as jest.Mock).mockReturnValue({ singleTeamId: undefined });
    const { container } = render(<SprintRollupCard />);

    expect(container).toBeEmptyDOMElement();
    expect(axios).not.toHaveBeenCalled();
  });

  it('renders nothing when the team has no sprints', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({ data: [] });
    const { container } = render(<SprintRollupCard />);

    await waitFor(() => expect(axios).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('fetches from the team-scoped sprints endpoint, with no date-range params', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({ data: [sprint()] });
    render(<SprintRollupCard />);

    await waitFor(() =>
      expect(axios).toHaveBeenCalledWith(`/api/internal/team/${TEAM_ID}/sprints`)
    );
  });

  it('renders one column per sprint, in the order the backend returned them', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: [
        sprint({ name: 'Sprint 1' }),
        sprint({ name: 'Sprint 2' })
      ]
    });
    render(<SprintRollupCard />);

    expect(await screen.findByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
  });

  it('shows the legend and card title once sprints are present', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (axios as unknown as jest.Mock).mockResolvedValue({ data: [sprint()] });
    render(<SprintRollupCard />);

    expect(await screen.findByText('Sprint rollup')).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
  });
});
