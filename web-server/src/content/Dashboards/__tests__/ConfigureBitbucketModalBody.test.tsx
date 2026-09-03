jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/useClustoxUser', () => ({ useClustoxUser: jest.fn() }));
jest.mock('@/store', () => ({ useDispatch: jest.fn() }));
jest.mock('notistack', () => ({ useSnackbar: jest.fn() }));
jest.mock('@/slices/auth', () => ({
  fetchCurrentOrg: jest.fn(() => ({ type: 'mock' }))
}));
jest.mock('@/slices/team', () => ({
  fetchTeams: jest.fn(() => ({ type: 'mock' }))
}));
jest.mock('@/utils/auth', () => ({
  checkBitbucketValidity: jest.fn(),
  linkProvider: jest.fn()
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSnackbar } from 'notistack';

import { Integration } from '@/constants/integrations';
import { ConfigureBitbucketModalBody } from '@/content/Dashboards/ConfigureBitbucketModalBody';
import { useAuth } from '@/hooks/useAuth';
import { useClustoxUser } from '@/hooks/useClustoxUser';
import { useDispatch } from '@/store';
import { checkBitbucketValidity, linkProvider } from '@/utils/auth';

const fillForm = async (
  email = 'hamad@clustox.com',
  token = 'an-api-token'
) => {
  const user = userEvent.setup();
  if (email)
    await user.type(screen.getByLabelText('Atlassian account email'), email);
  if (token)
    await user.type(screen.getByLabelText('Atlassian API Token'), token);
  await user.click(screen.getByRole('button', { name: /confirm/i }));
};

describe('ConfigureBitbucketModalBody', () => {
  const onClose = jest.fn();
  const dispatch = jest.fn(() => Promise.resolve());
  const enqueueSnackbar = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ orgId: 'org-1' });
    (useClustoxUser as jest.Mock).mockReturnValue({ orgId: null });
    (useDispatch as jest.Mock).mockReturnValue(dispatch);
    (useSnackbar as jest.Mock).mockReturnValue({ enqueueSnackbar });
    dispatch.mockReturnValue(Promise.resolve());
  });

  it('rejects a malformed email before any network call', async () => {
    render(<ConfigureBitbucketModalBody onClose={onClose} />);
    await fillForm('not-an-email', 'a-token');

    expect(
      screen.getByText('Enter the Atlassian account email for this token')
    ).toBeInTheDocument();
    expect(checkBitbucketValidity).not.toHaveBeenCalled();
    expect(linkProvider).not.toHaveBeenCalled();
  });

  it('shows the broad credentials error and does not link on a failed check', async () => {
    // CLUSTOX: the API cannot tell a revoked token from an expired one, and
    // Atlassian tokens expose no scope header -- the copy stays broad on
    // purpose.
    (checkBitbucketValidity as jest.Mock).mockResolvedValue({
      valid: false,
      reason: 'invalid_credentials'
    });
    render(<ConfigureBitbucketModalBody onClose={onClose} />);
    await fillForm();

    await waitFor(() =>
      expect(screen.getByText('Invalid email or API token')).toBeInTheDocument()
    );
    expect(linkProvider).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('names the missing account scope when the server could tell', async () => {
    (checkBitbucketValidity as jest.Mock).mockResolvedValue({
      valid: false,
      reason: 'missing_account_scope'
    });
    render(<ConfigureBitbucketModalBody onClose={onClose} />);
    await fillForm();

    await waitFor(() =>
      expect(
        screen.getByText(/missing the Account read scope/i)
      ).toBeInTheDocument()
    );
    expect(linkProvider).not.toHaveBeenCalled();
  });

  it('trims pasted whitespace before validating and linking', async () => {
    // CLUSTOX: a token copied from Atlassian's UI often carries a trailing
    // newline; untrimmed it corrupts the Basic auth pair into a 401 that
    // reads exactly like a wrong token.
    (checkBitbucketValidity as jest.Mock).mockResolvedValue({ valid: true });
    (linkProvider as jest.Mock).mockResolvedValue({});
    render(<ConfigureBitbucketModalBody onClose={onClose} />);
    await fillForm(' hamad@clustox.com ', 'an-api-token ');

    await waitFor(() => expect(linkProvider).toHaveBeenCalledTimes(1));
    expect(checkBitbucketValidity).toHaveBeenCalledWith(
      'hamad@clustox.com',
      'an-api-token'
    );
    expect(linkProvider).toHaveBeenCalledWith(
      'an-api-token',
      'org-1',
      expect.anything(),
      { email: 'hamad@clustox.com' }
    );
  });

  it('links with the email in meta on a passed check', async () => {
    (checkBitbucketValidity as jest.Mock).mockResolvedValue({ valid: true });
    (linkProvider as jest.Mock).mockResolvedValue({});
    render(<ConfigureBitbucketModalBody onClose={onClose} />);
    await fillForm();

    await waitFor(() => expect(linkProvider).toHaveBeenCalledTimes(1));
    // CLUSTOX: the email rides in provider_meta -- the sync factory reads it
    // back as the Basic auth username, so this exact shape is the contract.
    expect(linkProvider).toHaveBeenCalledWith(
      'an-api-token',
      'org-1',
      Integration.BITBUCKET,
      { email: 'hamad@clustox.com' }
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
