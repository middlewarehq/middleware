jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/useClustoxUser', () => ({ useClustoxUser: jest.fn() }));
jest.mock('@/store', () => ({ useDispatch: jest.fn() }));
jest.mock('notistack', () => ({ useSnackbar: jest.fn() }));
jest.mock('@/slices/auth', () => ({ fetchCurrentOrg: jest.fn(() => ({ type: 'mock' })) }));
jest.mock('@/utils/auth', () => ({
  checkJiraValidity: jest.fn(),
  linkProvider: jest.fn(),
  normalizeJiraSiteUrl: jest.requireActual('@/utils/auth').normalizeJiraSiteUrl
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSnackbar } from 'notistack';

import { ConfigureJiraModalBody } from '@/content/Dashboards/ConfigureJiraModalBody';
import { useAuth } from '@/hooks/useAuth';
import { useClustoxUser } from '@/hooks/useClustoxUser';
import { useDispatch } from '@/store';
import { checkJiraValidity, linkProvider } from '@/utils/auth';

const fillForm = async (
  siteUrl = 'mycompany.atlassian.net',
  email = 'jordan@mycompany.com',
  token = 'a-token'
) => {
  const user = userEvent.setup();
  if (siteUrl) await user.type(screen.getByLabelText('Jira Site URL'), siteUrl);
  if (email) await user.type(screen.getByLabelText('Email'), email);
  if (token) await user.type(screen.getByLabelText('API Token'), token);
  await user.click(screen.getByRole('button', { name: /verify.*link/i }));
};

describe('ConfigureJiraModalBody', () => {
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

  it('requires all three fields before attempting to verify anything', async () => {
    render(<ConfigureJiraModalBody onClose={onClose} />);
    await fillForm('', '', '');

    expect(
      screen.getByText('Please fill in all three fields')
    ).toBeInTheDocument();
    expect(checkJiraValidity).not.toHaveBeenCalled();
  });

  it('refuses to submit with no workspace resolved, rather than link an undefined org', async () => {
    (useAuth as jest.Mock).mockReturnValue({ orgId: null });
    (useClustoxUser as jest.Mock).mockReturnValue({ orgId: null });
    render(<ConfigureJiraModalBody onClose={onClose} />);
    await fillForm();

    expect(
      screen.getByText('No workspace selected. Reload the page and try again.')
    ).toBeInTheDocument();
    expect(checkJiraValidity).not.toHaveBeenCalled();
  });

  it("prefers the server-resolved workspace (useClustoxUser) over the redux-persisted one", async () => {
    (useAuth as jest.Mock).mockReturnValue({ orgId: 'stale-redux-org' });
    (useClustoxUser as jest.Mock).mockReturnValue({ orgId: 'fresh-server-org' });
    (checkJiraValidity as jest.Mock).mockResolvedValue({ valid: true });
    (linkProvider as jest.Mock).mockResolvedValue(undefined);
    render(<ConfigureJiraModalBody onClose={onClose} />);

    await fillForm();

    await waitFor(() =>
      expect(linkProvider).toHaveBeenCalledWith(
        'a-token',
        'fresh-server-org',
        'jira',
        expect.anything()
      )
    );
  });

  it.each([
    ['unauthorized', 'That email/API token combination was rejected by Jira.'],
    ['unreachable', "Couldn't reach that Jira site — check the URL."],
    ['unknown', 'Could not verify this Jira account. Please try again.']
  ])('shows the right message for reason=%s, and never links', async (reason, message) => {
    (checkJiraValidity as jest.Mock).mockResolvedValue({ valid: false, reason });
    render(<ConfigureJiraModalBody onClose={onClose} />);

    await fillForm();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(linkProvider).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('normalizes the site URL before storing it, even though it validates the raw input', async () => {
    (checkJiraValidity as jest.Mock).mockResolvedValue({ valid: true });
    (linkProvider as jest.Mock).mockResolvedValue(undefined);
    render(<ConfigureJiraModalBody onClose={onClose} />);

    await fillForm('https://mycompany.atlassian.net/', 'jordan@mycompany.com', 'tok');

    await waitFor(() =>
      expect(checkJiraValidity).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/', // raw input, unmodified
        'jordan@mycompany.com',
        'tok'
      )
    );
    await waitFor(() =>
      expect(linkProvider).toHaveBeenCalledWith(
        'tok',
        'org-1',
        'jira',
        { site_url: 'mycompany.atlassian.net', email: 'jordan@mycompany.com' } // normalized
      )
    );
  });

  it('awaits fetchCurrentOrg before closing -- the card behind this modal reads Redux directly', async () => {
    const order: string[] = [];
    (checkJiraValidity as jest.Mock).mockResolvedValue({ valid: true });
    (linkProvider as jest.Mock).mockResolvedValue(undefined);
    dispatch.mockImplementation(() => {
      order.push('fetchCurrentOrg');
      return Promise.resolve();
    });
    onClose.mockImplementation(() => order.push('onClose'));
    render(<ConfigureJiraModalBody onClose={onClose} />);

    await fillForm();

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(order).toEqual(['fetchCurrentOrg', 'onClose']);
  });

  it('shows the signed-in-as name on success when Jira returned one', async () => {
    (checkJiraValidity as jest.Mock).mockResolvedValue({
      valid: true,
      displayName: 'Jordan Diaz'
    });
    (linkProvider as jest.Mock).mockResolvedValue(undefined);
    render(<ConfigureJiraModalBody onClose={onClose} />);

    await fillForm();

    await waitFor(() =>
      expect(enqueueSnackbar).toHaveBeenCalledWith(
        'Jira linked — signed in as Jordan Diaz',
        expect.objectContaining({ variant: 'success' })
      )
    );
  });

  it('falls back to a generic success message when Jira did not return a display name', async () => {
    (checkJiraValidity as jest.Mock).mockResolvedValue({ valid: true });
    (linkProvider as jest.Mock).mockResolvedValue(undefined);
    render(<ConfigureJiraModalBody onClose={onClose} />);

    await fillForm();

    await waitFor(() =>
      expect(enqueueSnackbar).toHaveBeenCalledWith(
        'Jira linked successfully',
        expect.objectContaining({ variant: 'success' })
      )
    );
  });

  it('shows the error message and does not close when linkProvider itself throws', async () => {
    (checkJiraValidity as jest.Mock).mockResolvedValue({ valid: true });
    (linkProvider as jest.Mock).mockRejectedValue(new Error('org already has jira'));
    render(<ConfigureJiraModalBody onClose={onClose} />);

    await fillForm();

    expect(await screen.findByText('org already has jira')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
