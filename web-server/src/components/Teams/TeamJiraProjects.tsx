import { Close } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Autocomplete,
  Card,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  useTheme
} from '@mui/material';
import { FC } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { useAuth } from '@/hooks/useAuth';

import {
  SelectedJiraProject,
  useTeamJiraProjectsConfig
} from './useTeamJiraProjectsConfig';

// CLUSTOX: Jira integration, Phase 2 (project selection) -- see
// docs/JIRA_INTEGRATION_PROPOSAL.md. Only rendered for an existing team
// (Jira projects link to a team_id that must already exist) in an org
// that has actually linked Jira; saves independently of the team's
// name/repos via its own button, deliberately decoupled from
// useTeamsConfig.tsx's repo-save flow.
export const TeamJiraProjects: FC<{ teamId: ID }> = ({ teamId }) => {
  const { integrations } = useAuth();
  const isJiraLinked = Boolean(integrations?.jira?.integrated);

  if (!teamId || !isJiraLinked) return null;

  return <TeamJiraProjectsBody teamId={teamId} />;
};

const TeamJiraProjectsBody: FC<{ teamId: ID }> = ({ teamId }) => {
  const {
    selectedProjects,
    projectOptions,
    handleSelectionChange,
    unselectProject,
    onSearchChange,
    isSearching,
    isLoading,
    isSaving,
    onSave
  } = useTeamJiraProjectsConfig(teamId);
  const theme = useTheme();

  if (isLoading) {
    return (
      <FlexBox alignCenter gap2>
        <CircularProgress size="20px" />
        <Line>Loading Jira projects...</Line>
      </FlexBox>
    );
  }

  return (
    <FlexBox col gap={2}>
      <FlexBox col>
        <Line big semibold>
          Jira Projects
        </Line>
        <Line>Select the Jira project(s) this team works out of</Line>
      </FlexBox>

      <FlexBox alignItems="center" gap={2}>
        <Autocomplete
          noOptionsText="Start typing to search..."
          loading={isSearching}
          loadingText="Searching Jira projects..."
          disableCloseOnSelect
          disableClearable
          sx={{ width: '320px', minWidth: '260px' }}
          multiple
          options={projectOptions}
          value={selectedProjects}
          onChange={handleSelectionChange}
          getOptionLabel={(option) => `${option.key} — ${option.name}`}
          isOptionEqualToValue={(option, value) =>
            option.idempotency_key === value.idempotency_key
          }
          renderInput={(params) => (
            <TextField
              {...params}
              onChange={onSearchChange}
              label={
                selectedProjects.length
                  ? `${selectedProjects.length} selected`
                  : 'Search Jira projects'
              }
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isSearching ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                )
              }}
            />
          )}
          renderOption={(props, option, { selected }) => (
            <li {...props} key={option.idempotency_key}>
              <FlexBox justifyBetween fullWidth gap={2}>
                <Line>
                  {option.key} — {option.name}
                </Line>
                {selected ? <Close fontSize="small" /> : null}
              </FlexBox>
            </li>
          )}
          renderTags={() => null}
        />
        <LoadingButton
          loading={isSaving}
          disabled={isSaving}
          variant="contained"
          onClick={onSave}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Save Jira projects
        </LoadingButton>
      </FlexBox>

      <SelectedProjectsTable
        projects={selectedProjects}
        onRemove={unselectProject}
        borderColor={theme.colors.secondary.light}
      />
    </FlexBox>
  );
};

const SelectedProjectsTable: FC<{
  projects: SelectedJiraProject[];
  onRemove: (idempotencyKey: string) => void;
  borderColor: string;
}> = ({ projects, onRemove, borderColor }) => {
  if (!projects.length) return null;

  return (
    <TableContainer
      component={Card}
      sx={{ border: `2px solid ${borderColor}`, borderRadius: 1 }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ px: 2 }}>Key</TableCell>
            <TableCell sx={{ px: 2 }}>Name</TableCell>
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.idempotency_key}>
              <TableCell sx={{ px: 2 }}>{project.key}</TableCell>
              <TableCell sx={{ px: 2 }}>{project.name}</TableCell>
              <TableCell align="right">
                <IconButton
                  aria-label={`Remove ${project.key} from this team`}
                  onClick={() => onRemove(project.idempotency_key)}
                  size="small"
                >
                  <Close fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
