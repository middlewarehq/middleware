jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/content/Dashboards/useIntegrationHandlers', () => ({
  useIntegrationHandlers: jest.fn()
}));
jest.mock('@/store', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));
jest.mock('notistack', () => ({ useSnackbar: jest.fn() }));
jest.mock('@/slices/auth', () => ({ fetchCurrentOrg: jest.fn(() => ({ type: 'mock' })) }));

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSnackbar } from 'notistack';

import { JiraIntegrationCard } from '@/content/Dashboards/JiraIntegrationCard';
import { useIntegrationHandlers } from '@/content/Dashboards/useIntegrationHandlers';
import { useAuth } from '@/hooks/useAuth';
import { useDispatch, useSelector } from '@/store';
import { renderWithTheme as render } from '@/utils/testUtils';

const link = { jira: jest.fn() };
const unlink = { jira: jest.fn().mockResolvedValue(undefined) };

describe('JiraIntegrationCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useIntegrationHandlers as jest.Mock).mockReturnValue({ link, unlink });
    (useSelector as jest.Mock).mockReturnValue(false); // requests.org !== REQUEST
    (useDispatch as jest.Mock).mockReturnValue(jest.fn());
    (useSnackbar as jest.Mock).mockReturnValue({ enqueueSnackbar: jest.fn() });
  });

  it('shows "Link" and no Linked badge when integrations.jira is falsy', () => {
    (useAuth as jest.Mock).mockReturnValue({ integrations: {} });
    render(<JiraIntegrationCard />);

    expect(screen.getByText('Link')).toBeInTheDocument();
    expect(screen.queryByTestId('jira-linked-badge')).not.toBeInTheDocument();
  });

  it('shows "Unlink" and the Linked badge when integrations.jira is truthy', () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    render(<JiraIntegrationCard />);

    expect(screen.getByText('Unlink')).toBeInTheDocument();
    expect(screen.getByTestId('jira-linked-badge')).toBeInTheDocument();
  });

  it('opens the Configure Jira modal via link.jira() when not yet linked', async () => {
    (useAuth as jest.Mock).mockReturnValue({ integrations: {} });
    render(<JiraIntegrationCard />);

    await userEvent.click(screen.getByText('Link'));

    expect(link.jira).toHaveBeenCalledTimes(1);
    expect(unlink.jira).not.toHaveBeenCalled();
  });

  it('asks for confirmation before unlinking, and does nothing if declined', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(<JiraIntegrationCard />);

    await userEvent.click(screen.getByText('Unlink'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(unlink.jira).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('unlinks and shows a success snackbar when confirmed', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    const enqueueSnackbar = jest.fn();
    (useSnackbar as jest.Mock).mockReturnValue({ enqueueSnackbar });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<JiraIntegrationCard />);

    await userEvent.click(screen.getByText('Unlink'));

    expect(unlink.jira).toHaveBeenCalledTimes(1);
    expect(enqueueSnackbar).toHaveBeenCalledWith(
      'Jira unlinked successfully',
      expect.objectContaining({ variant: 'success' })
    );
  });

  it('shows a failure snackbar, not a thrown error, when unlink rejects', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      integrations: { jira: { integrated: true } }
    });
    unlink.jira.mockRejectedValueOnce(new Error('network down'));
    const enqueueSnackbar = jest.fn();
    (useSnackbar as jest.Mock).mockReturnValue({ enqueueSnackbar });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<JiraIntegrationCard />);

    await userEvent.click(screen.getByText('Unlink'));

    expect(
      await screen.findByText((t) => t === 'Unlink')
    ).toBeInTheDocument();
    expect(enqueueSnackbar).toHaveBeenCalledWith(
      'Failed to unlink Jira',
      expect.objectContaining({ variant: 'error' })
    );
  });
});
