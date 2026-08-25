jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/content/Dashboards/useIntegrationHandlers', () => ({
  useIntegrationHandlers: jest.fn()
}));
jest.mock('@/store', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));
jest.mock('notistack', () => ({ useSnackbar: jest.fn() }));
jest.mock('@/slices/auth', () => ({
  fetchCurrentOrg: jest.fn(() => ({ type: 'mock' }))
}));
jest.mock('@/constants/events', () => ({ track: jest.fn() }));

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSnackbar } from 'notistack';

import { BitbucketIntegrationCard } from '@/content/Dashboards/BitbucketIntegrationCard';
import { useIntegrationHandlers } from '@/content/Dashboards/useIntegrationHandlers';
import { useAuth } from '@/hooks/useAuth';
import { useDispatch, useSelector } from '@/store';
import { renderWithTheme as render } from '@/utils/testUtils';

const link = { bitbucket: jest.fn() };
const unlink = { bitbucket: jest.fn().mockResolvedValue(undefined) };

describe('BitbucketIntegrationCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useIntegrationHandlers as jest.Mock).mockReturnValue({ link, unlink });
    (useSelector as jest.Mock).mockReturnValue(false);
    (useDispatch as jest.Mock).mockReturnValue(jest.fn());
    (useSnackbar as jest.Mock).mockReturnValue({ enqueueSnackbar: jest.fn() });
  });

  it('offers Link when bitbucket is not integrated, and opens the modal', async () => {
    (useAuth as jest.Mock).mockReturnValue({ integrations: {} });
    render(<BitbucketIntegrationCard />);

    expect(screen.getByText('Link')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByText('Link'));
    expect(link.bitbucket).toHaveBeenCalledTimes(1);
  });

  it('renders alongside an existing setup untouched: linked state reads from integrations.bitbucket only', () => {
    // CLUSTOX: provider isolation on the frontend -- a workspace with GitHub
    // and GitLab linked but not Bitbucket must see this card in its unlinked
    // state, not inherit anyone else's.
    (useAuth as jest.Mock).mockReturnValue({
      integrations: {
        github: { integrated: true },
        gitlab: { integrated: true }
      }
    });
    render(<BitbucketIntegrationCard />);

    expect(screen.getByText('Link')).toBeInTheDocument();
  });
});
