import {
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  CircularProgress
} from '@mui/material';
import { union } from 'ramda';
import { FC, useCallback, useMemo } from 'react';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { Line } from '@/components/Text';
import { track } from '@/constants/events';
import { CIProvider, Integration } from '@/constants/integrations';
import { useAuth } from '@/hooks/useAuth';
import { useEasyState, useBoolState } from '@/hooks/useEasyState';
import {
  BaseRepo,
  RepoWorkflowResponse,
  RepoWorkflow
} from '@/types/resources';
import { depFn } from '@/utils/fn';

import { AsyncSelectOptions } from './AsyncSelect';
import { FlexBox } from './FlexBox';
import { useTeamCRUD } from './Teams/useTeamsConfig';

export const DeploymentWorkflowSelector: FC<{ repo: BaseRepo }> = ({
  repo
}) => {
  const { orgId } = useAuth();

  const options = useEasyState<AsyncSelectOptions>([]);
  const nextPageToken = useEasyState<string | null>('');
  const loading = useBoolState();
  const { updateWorkflowsForTeam } = useTeamCRUD();
  const provider = Integration.GITHUB;

  const selectedOptions = useMemo(
    () =>
      repo.repo_workflows?.map((val) => ({
        label: val.name,
        value: val.value
      })) || [],
    [repo.repo_workflows]
  );
  const loadWorkflows = useCallback(async () => {
    if (!orgId) return;

    track('VIEW_WORKFLOWS_FOR_REPO', { repo });

    const workflowsResponse: RepoWorkflowResponse = await depFn(
      loading.trackAsync,
      () =>
        handleApi<RepoWorkflow[]>(`/internal/${orgId}/integrations/workflows`, {
          params: {
            provider: provider,
            org_name: repo.parent,
            repo_name: repo.name,
            repo_slug: repo.slug,
            next_page_token: nextPageToken.value
          }
        })
    );

    const workflows = workflowsResponse.workflows;

    nextPageToken.set(workflowsResponse.next_page_token);

    const workflowOpts = workflows.map((w: RepoWorkflow) => ({
      renderLabel: (
        <FlexBox
          fullWidth
          justifyBetween
          alignCenter
          sx={{
            fontSize: '12px'
          }}
        >
          {w.name}
          <Chip
            label="Github Actions"
            size="small"
            color="default"
            sx={{
              fontSize: '8px'
            }}
          />
        </FlexBox>
      ),
      label: w.name,
      value: w.id
    }));

    depFn(options.set, (prev) => union(prev, workflowOpts));
  }, [orgId, repo, loading.trackAsync, nextPageToken, options.set, provider]);

  const alreadySelectedWorkflowIds = useMemo(
    () => selectedOptions.map((o) => o.value),
    [selectedOptions]
  );

  return (
    <FormControl sx={{ width: 250 }}>
      <InputLabel
        sx={{
          top: '-6px',
          '&.MuiInputLabel-shrink': {
            top: '0px'
          }
        }}
      >
        Choose Workflow
      </InputLabel>
      <Select
        multiple
        value={selectedOptions}
        onOpen={loadWorkflows}
        input={<OutlinedInput label="Choose workflow" margin="dense" />}
        renderValue={(selected) => selected.map((w) => w.label).join(', ')}
        size="small"
        sx={{ textAlign: 'start' }}
      >
        {loading.value ? (
          <FlexBox alignCenter gap2>
            <CircularProgress size="20px" />
            <Line>Loading...</Line>
          </FlexBox>
        ) : (
          options.value.map((o) => {
            return (
              <MenuItem key={o.value}>
                <Checkbox
                  checked={alreadySelectedWorkflowIds.includes(String(o.value))}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    const updatedOptions = isChecked
                      ? [
                          ...selectedOptions,
                          { label: o.label, value: String(o.value) }
                        ]
                      : selectedOptions.filter(
                          (w) => w.value !== String(o.value)
                        );
                    updateWorkflowsForTeam(
                      repo,
                      updatedOptions.map((rw) => ({
                        name: rw.label,
                        value: rw.value
                      }))
                    );
                  }}
                />
                <ListItemText primary={o.label} />
              </MenuItem>
            );
          })
        )}
      </Select>
    </FormControl>
  );
};
