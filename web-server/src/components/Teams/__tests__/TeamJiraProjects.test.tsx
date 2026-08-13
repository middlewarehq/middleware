jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../useTeamJiraProjectsConfig', () => ({
  useTeamJiraProjectsConfig: jest.fn()
}));

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useAuth } from '@/hooks/useAuth';
import { renderWithTheme as render } from '@/utils/testUtils';

import { TeamJiraProjects } from '../TeamJiraProjects';
import {
  SelectedJiraProject,
  useTeamJiraProjectsConfig
} from '../useTeamJiraProjectsConfig';

const TEAM_ID = 'team-1';

const baseConfig = {
  selectedProjects: [] as SelectedJiraProject[],
  projectOptions: [] as SelectedJiraProject[],
  handleSelectionChange: jest.fn(),
  unselectProject: jest.fn(),
  onSearchChange: jest.fn(),
  isSearching: false,
  isLoading: false,
  isSaving: false,
  onSave: jest.fn()
};

describe('TeamJiraProjects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTeamJiraProjectsConfig as jest.Mock).mockReturnValue(baseConfig);
  });

  it('renders nothing when there is no team_id yet', () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    const { container } = render(<TeamJiraProjects teamId={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when Jira is not linked for this org', () => {
    (useAuth as jest.Mock).mockReturnValue({ integrations: {} });
    const { container } = render(<TeamJiraProjects teamId={TEAM_ID} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the project search once Jira is linked and a team exists', () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    render(<TeamJiraProjects teamId={TEAM_ID} />);

    // MUI's outlined TextField renders the label text twice (once as the
    // real <label>, once mirrored into the notched-outline <legend>) --
    // getByLabelText resolves the actual label-for-input association and
    // isn't tripped up by that visual duplicate the way getByText is.
    expect(screen.getByLabelText('Search Jira projects')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('shows a loading state instead of the search while the team’s current projects load', () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    (useTeamJiraProjectsConfig as jest.Mock).mockReturnValue({
      ...baseConfig,
      isLoading: true
    });
    render(<TeamJiraProjects teamId={TEAM_ID} />);

    expect(screen.getByText('Loading Jira projects...')).toBeInTheDocument();
    expect(screen.queryByText('Search Jira projects')).not.toBeInTheDocument();
  });

  it('lists every selected project with a remove action', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    const unselectProject = jest.fn();
    (useTeamJiraProjectsConfig as jest.Mock).mockReturnValue({
      ...baseConfig,
      selectedProjects: [
        {
          id: '10001',
          key: 'PAY',
          name: 'Payments',
          provider: 'jira',
          idempotency_key: 'jira:org-1:10001'
        }
      ],
      unselectProject
    });
    render(<TeamJiraProjects teamId={TEAM_ID} />);

    expect(screen.getByText('PAY')).toBeInTheDocument();
    expect(screen.getByText('Payments')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove PAY from this team' })
    );

    expect(unselectProject).toHaveBeenCalledWith('jira:org-1:10001');
  });

  it('calls onSave when the Save button is clicked', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    const onSave = jest.fn();
    (useTeamJiraProjectsConfig as jest.Mock).mockReturnValue({
      ...baseConfig,
      onSave
    });
    render(<TeamJiraProjects teamId={TEAM_ID} />);

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
