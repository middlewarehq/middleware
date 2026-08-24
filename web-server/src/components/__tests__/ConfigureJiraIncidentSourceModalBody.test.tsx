jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/useClustoxUser', () => ({ useClustoxUser: jest.fn() }));
jest.mock('notistack', () => ({ useSnackbar: jest.fn() }));
jest.mock('@/api-helpers/axios-api-instance', () => ({ handleApi: jest.fn() }));

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSnackbar } from 'notistack';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { ConfigureJiraIncidentSourceModalBody } from '@/components/ConfigureJiraIncidentSourceModalBody';
import { useAuth } from '@/hooks/useAuth';
import { useClustoxUser } from '@/hooks/useClustoxUser';
import { renderWithTheme as render } from '@/utils/testUtils';

describe('ConfigureJiraIncidentSourceModalBody', () => {
  const onClose = jest.fn();
  const enqueueSnackbar = jest.fn();

  const mockGets = (sources: string[], types: string[]) => {
    (handleApi as jest.Mock).mockImplementation((_url, params) => {
      if (params?.method === 'PUT') return Promise.resolve({});
      if (params?.params?.setting_type === 'INCIDENT_SOURCES_SETTING') {
        return Promise.resolve({ incident_sources: sources });
      }
      if (params?.params?.setting_type === 'JIRA_INCIDENT_ISSUE_TYPES_SETTING') {
        return Promise.resolve({ issue_types: types });
      }
      return Promise.resolve({});
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ orgId: 'org-1' });
    (useClustoxUser as jest.Mock).mockReturnValue({ orgId: null });
    (useSnackbar as jest.Mock).mockReturnValue({ enqueueSnackbar });
  });

  it('reflects the current setting on load: enabled with its configured issue types', async () => {
    mockGets(['INCIDENT_SERVICE', 'JIRA_ISSUE'], ['Bug', 'Incident']);
    render(<ConfigureJiraIncidentSourceModalBody onClose={onClose} />);

    await waitFor(() =>
      expect(screen.getByRole('checkbox')).toBeChecked()
    );
    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText('Incident')).toBeInTheDocument();
  });

  it('reflects the current setting on load: disabled when JIRA_ISSUE is absent', async () => {
    mockGets(['INCIDENT_SERVICE', 'GIT_REPO'], []);
    render(<ConfigureJiraIncidentSourceModalBody onClose={onClose} />);

    await waitFor(() =>
      expect(screen.getByRole('checkbox')).not.toBeChecked()
    );
  });

  it('save is disabled while enabled with no issue types selected', async () => {
    mockGets([], []);
    render(<ConfigureJiraIncidentSourceModalBody onClose={onClose} />);
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked());

    const user = userEvent.setup();
    await user.click(screen.getByRole('checkbox'));

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saving preserves the other incident sources already configured, adding only JIRA_ISSUE', async () => {
    mockGets(['INCIDENT_SERVICE', 'GIT_REPO'], ['Bug']);
    render(<ConfigureJiraIncidentSourceModalBody onClose={onClose} />);
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked());

    const user = userEvent.setup();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(handleApi).toHaveBeenCalledWith(
        '/internal/org-1/settings',
        expect.objectContaining({
          method: 'PUT',
          data: {
            setting_type: 'INCIDENT_SOURCES_SETTING',
            setting_data: {
              incident_sources: ['INCIDENT_SERVICE', 'GIT_REPO', 'JIRA_ISSUE']
            }
          }
        })
      )
    );
  });

  it('saving with the switch turned off removes JIRA_ISSUE and leaves the rest untouched', async () => {
    mockGets(['INCIDENT_SERVICE', 'JIRA_ISSUE', 'GIT_REPO'], ['Bug']);
    render(<ConfigureJiraIncidentSourceModalBody onClose={onClose} />);
    await waitFor(() => expect(screen.getByRole('checkbox')).toBeChecked());

    const user = userEvent.setup();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(handleApi).toHaveBeenCalledWith(
        '/internal/org-1/settings',
        expect.objectContaining({
          method: 'PUT',
          data: {
            setting_type: 'INCIDENT_SOURCES_SETTING',
            setting_data: {
              incident_sources: ['INCIDENT_SERVICE', 'GIT_REPO']
            }
          }
        })
      )
    );
  });

  it('closes and shows a success toast after a successful save', async () => {
    mockGets(['GIT_REPO'], ['Bug']);
    render(<ConfigureJiraIncidentSourceModalBody onClose={onClose} />);
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked());

    const user = userEvent.setup();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(enqueueSnackbar).toHaveBeenCalledWith(
      'Updated Successfully',
      expect.objectContaining({ variant: 'success' })
    );
  });

  it('shows an error toast and does not close when saving fails', async () => {
    mockGets(['GIT_REPO'], ['Bug']);
    (handleApi as jest.Mock).mockImplementation((_url, params) => {
      if (params?.method === 'PUT') return Promise.reject(new Error('nope'));
      if (params?.params?.setting_type === 'INCIDENT_SOURCES_SETTING') {
        return Promise.resolve({ incident_sources: ['GIT_REPO'] });
      }
      return Promise.resolve({ issue_types: ['Bug'] });
    });
    render(<ConfigureJiraIncidentSourceModalBody onClose={onClose} />);
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked());

    const user = userEvent.setup();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(enqueueSnackbar).toHaveBeenCalledWith(
        'Something went wrong',
        expect.objectContaining({ variant: 'error' })
      )
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows an error toast when the initial load fails', async () => {
    (handleApi as jest.Mock).mockRejectedValue(new Error('down'));
    render(<ConfigureJiraIncidentSourceModalBody onClose={onClose} />);

    await waitFor(() =>
      expect(enqueueSnackbar).toHaveBeenCalledWith(
        'Could not load the current setting',
        expect.objectContaining({ variant: 'error' })
      )
    );
  });
});
