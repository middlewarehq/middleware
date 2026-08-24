import { Autocomplete, Chip, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useSnackbar } from 'notistack';
import { FC, useCallback, useEffect } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { IOSSwitch } from '@/components/Shared';
import { Line } from '@/components/Text';
import { useAuth } from '@/hooks/useAuth';
// CLUSTOX: server-resolved workspace, immune to stale persisted redux state --
// same reasoning as ConfigureJiraModalBody.
import { useClustoxUser } from '@/hooks/useClustoxUser';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { handleApi } from '@/api-helpers/axios-api-instance';

const INCIDENT_SOURCES_SETTING = 'INCIDENT_SOURCES_SETTING';
const JIRA_INCIDENT_ISSUE_TYPES_SETTING = 'JIRA_INCIDENT_ISSUE_TYPES_SETTING';
const JIRA_ISSUE_SOURCE = 'JIRA_ISSUE';

const COMMON_ISSUE_TYPES = ['Bug', 'Incident', 'Task', 'Story'];

type IncidentSourcesSetting = { incident_sources: string[] };
type JiraIncidentIssueTypesSetting = { issue_types: string[] };

// CLUSTOX: Jira issues as an incident source for Change Failure Rate /
// MTTR -- org-scoped, opt-in (see docs/JIRA_INTEGRATION_PROPOSAL.md). No
// dedicated org-settings page exists yet, so this is surfaced from the
// same DoraMetricsConfigurationSettings menu as the team-scoped Incident
// PR filters, using the generic /orgs/{org_id}/settings route every
// other setting on this page already reads/writes.
export const ConfigureJiraIncidentSourceModalBody: FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const { orgId: contextOrgId } = useAuth();
  const { orgId: sessionOrgId } = useClustoxUser();
  const orgId = sessionOrgId ?? contextOrgId;
  const { enqueueSnackbar } = useSnackbar();

  const isLoading = useBoolState(true);
  const isSaving = useBoolState(false);
  const enabled = useEasyState(false);
  const issueTypes = useEasyState<string[]>([]);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    Promise.all([
      // CLUSTOX: this BFF route (pages/api/internal/[org_id]/settings.ts)
      // already unwraps the backend's { setting: T, ... } envelope to
      // just T before responding -- see its GET handler.
      handleApi<IncidentSourcesSetting>(`/internal/${orgId}/settings`, {
        params: { setting_type: INCIDENT_SOURCES_SETTING }
      }),
      handleApi<JiraIncidentIssueTypesSetting>(`/internal/${orgId}/settings`, {
        params: { setting_type: JIRA_INCIDENT_ISSUE_TYPES_SETTING }
      })
    ])
      .then(([sources, types]) => {
        if (cancelled) return;
        enabled.set(
          (sources.incident_sources || []).includes(JIRA_ISSUE_SOURCE)
        );
        issueTypes.set(types.issue_types || []);
      })
      .catch(() => {
        if (cancelled) return;
        enqueueSnackbar('Could not load the current setting', {
          variant: 'error',
          autoHideDuration: 3000
        });
      })
      .finally(() => {
        if (!cancelled) isLoading.false();
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleSave = useCallback(async () => {
    if (!orgId) return;
    isSaving.true();
    try {
      const currentSources = await handleApi<IncidentSourcesSetting>(
        `/internal/${orgId}/settings`,
        { params: { setting_type: INCIDENT_SOURCES_SETTING } }
      );

      const withoutJira = (currentSources.incident_sources || []).filter(
        (source: string) => source !== JIRA_ISSUE_SOURCE
      );
      const nextSources = enabled.value
        ? [...withoutJira, JIRA_ISSUE_SOURCE]
        : withoutJira;

      await handleApi(`/internal/${orgId}/settings`, {
        method: 'PUT',
        data: {
          setting_type: INCIDENT_SOURCES_SETTING,
          setting_data: { incident_sources: nextSources }
        }
      });

      await handleApi(`/internal/${orgId}/settings`, {
        method: 'PUT',
        data: {
          setting_type: JIRA_INCIDENT_ISSUE_TYPES_SETTING,
          setting_data: { issue_types: issueTypes.value }
        }
      });

      enqueueSnackbar('Updated Successfully', {
        variant: 'success',
        autoHideDuration: 3000
      });
      onClose();
    } catch (e: any) {
      enqueueSnackbar('Something went wrong', {
        variant: 'error',
        autoHideDuration: 3000
      });
    } finally {
      isSaving.false();
    }
  }, [orgId, enabled.value, issueTypes.value, enqueueSnackbar, onClose, isSaving]);

  return (
    <FlexBox col gap={2} minWidth={'420px'}>
      <Line white small mt={-1}>
        Treat Jira issues of the selected type(s) as incidents for Change
        Failure Rate and MTTR, alongside whatever other incident sources
        this org already has configured.
      </Line>

      <FlexBox alignCenter justifyBetween>
        <Line big>Use Jira issues as an incident source</Line>
        <IOSSwitch
          disabled={isLoading.value}
          checked={enabled.value}
          onChange={(_, isEnabled) => enabled.set(isEnabled)}
        />
      </FlexBox>

      <FlexBox col gap1>
        <Line>Which issue types count as an incident</Line>
        <Autocomplete
          multiple
          freeSolo
          disabled={isLoading.value}
          options={COMMON_ISSUE_TYPES}
          value={issueTypes.value}
          onChange={(_, value) => issueTypes.set(value)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                variant="outlined"
                label={option}
                size="small"
                {...getTagProps({ index })}
                key={option}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={
                issueTypes.value.length ? '' : 'e.g. Bug, Incident'
              }
              size="small"
            />
          )}
        />
      </FlexBox>

      <FlexBox justifyEnd>
        <LoadingButton
          loading={isSaving.value}
          disabled={isLoading.value || (enabled.value && !issueTypes.value.length)}
          variant="contained"
          onClick={handleSave}
        >
          Save
        </LoadingButton>
      </FlexBox>
    </FlexBox>
  );
};
