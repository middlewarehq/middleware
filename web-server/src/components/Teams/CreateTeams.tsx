import { Close, GitHub } from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import {
  Autocomplete,
  Button,
  Card,
  CircularProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  TableContainer,
  useTheme,
  InputLabel,
  FormControl,
  OutlinedInput
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { FC, useCallback } from 'react';

import {
  useTeamCRUD,
  TeamsCRUDProvider
} from '@/components/Teams/useTeamsConfig';
import { DeploymentWorkflowSelector } from '@/components/WorkflowSelector';
import { Integration } from '@/constants/integrations';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import GitlabIcon from '@/mocks/icons/gitlab.svg';
import { BaseRepo, DeploymentSources } from '@/types/resources';
import { trimWithEllipsis } from '@/utils/stringFormatting';

import AnimatedInputWrapper from '../AnimatedInputWrapper/AnimatedInputWrapper';
import { FlexBox } from '../FlexBox';
import { Line } from '../Text';

export type CRUDProps = {
  onSave?: AnyFunction;
  onDiscard?: AnyFunction;
  teamId?: ID;
};

const MAX_LENGTH_REPO_NAME = 25;
const MAX_LENGTH_PARENT_NAME = 25;

export const CreateEditTeams: FC<CRUDProps> = ({
  onSave,
  onDiscard,
  teamId
}) => {
  return (
    <TeamsCRUDProvider teamId={teamId}>
      <TeamsCRUD teamId={teamId} onDiscard={onDiscard} onSave={onSave} />
    </TeamsCRUDProvider>
  );
};

const TeamsCRUD: FC<CRUDProps> = ({ onSave, onDiscard }) => {
  const { isPageLoading, editingTeam, isEditing } = useTeamCRUD();
  return (
    <>
      {isPageLoading ? (
        <Loader />
      ) : (
        <FlexBox
          gap={4}
          col
          justifyBetween
          component={Card}
          p={2}
          width={'900px'}
        >
          {isEditing && !editingTeam?.name ? (
            <FlexBox>No team selected</FlexBox>
          ) : (
            <>
              <Heading />
              <TeamName />
              <TeamRepos />
              <ActionTray onDiscard={onDiscard} onSave={onSave} />
            </>
          )}
        </FlexBox>
      )}
    </>
  );
};

export const Loader: FC<{ label?: string }> = ({ label = 'Loading...' }) => {
  return (
    <FlexBox alignCenter gap2>
      <CircularProgress size="20px" />
      <Line>{label}</Line>
    </FlexBox>
  );
};

const Heading = () => {
  const { isEditing, editingTeam } = useTeamCRUD();
  const heading = isEditing ? 'Edit a team' : 'Create a team';

  return (
    <FlexBox col>
      <Line huge semibold>
        {heading}
      </Line>
      {isEditing ? (
        <Line>
          Currently editing{' '}
          <Line info semibold>
            {editingTeam?.name}
          </Line>{' '}
        </Line>
      ) : (
        <Line>Create a team to generate metric insights</Line>
      )}
    </FlexBox>
  );
};

const TeamName = () => {
  const {
    teamName,
    handleTeamNameChange,
    showTeamNameError,
    raiseTeamNameError
  } = useTeamCRUD();

  return (
    <FlexBox col gap={2} relative>
      <FlexBox col>
        <Line big semibold>
          Team Name
        </Line>
        <Line>Choose a name for your team</Line>
      </FlexBox>

      <FlexBox>
        <TextField
          value={teamName}
          onChange={handleTeamNameChange}
          placeholder="Enter team name"
          error={showTeamNameError}
          sx={{ width: '260px', minWidth: '260px' }}
          onBlur={raiseTeamNameError}
          autoComplete="off"
        />
      </FlexBox>
    </FlexBox>
  );
};

const TeamRepos: FC = () => {
  const {
    repoOptions,
    teamRepoError,
    handleRepoSelectionChange,
    selectedRepos,
    raiseTeamRepoError,
    loadingRepos,
    handleReposSearch
  } = useTeamCRUD();

  const searchQuery = useEasyState('');
  const searchFocus = useBoolState(false);

  const checkOverflow = useCallback(
    (option: BaseRepo) =>
      option.name?.length > MAX_LENGTH_REPO_NAME ||
      option.parent?.length > MAX_LENGTH_PARENT_NAME,
    []
  );

  const addEllipsis = (text: string, maxLength: number) =>
    text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;

  const OverFlowTooltip = ({
    parent,
    name
  }: {
    parent: string;
    name: string;
  }) => {
    return (
      <FlexBox>
        {parent} / {name}
      </FlexBox>
    );
  };

  return (
    <FlexBox col gap={2}>
      <FlexBox col>
        <Line big semibold>
          Add Repositories
        </Line>
        <Line>Select repositories for this team</Line>
      </FlexBox>
      <FlexBox>
        <Autocomplete
          noOptionsText={
            !searchQuery.value
              ? 'Start typing to search...'
              : 'No repositories found'
          }
          loading={loadingRepos}
          loadingText="Loading repos..."
          onBlur={raiseTeamRepoError}
          disableCloseOnSelect
          disableClearable
          sx={{ width: '260px', height: '48px', minWidth: '260px' }}
          multiple
          options={repoOptions}
          value={selectedRepos}
          onChange={handleRepoSelectionChange}
          getOptionLabel={(option) => `${option.parent}/${option.name}`}
          renderInput={(params) => (
            <TextField
              onKeyDown={(event) => {
                if (event.key === 'Backspace') {
                  event.stopPropagation();
                }
              }}
              onFocus={searchFocus.true}
              onBlur={searchFocus.false}
              onChange={(e) => {
                handleReposSearch(e as React.ChangeEvent<HTMLInputElement>);
                searchQuery.set(e.target.value);
              }}
              {...params}
              label={
                selectedRepos.length ? (
                  `${selectedRepos.length} selected`
                ) : !searchFocus.value ? (
                  <AnimatedInputWrapper />
                ) : (
                  'Search for org/repo'
                )
              }
              error={teamRepoError}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingRepos ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                )
              }}
            />
          )}
          renderOption={(props, option, { selected }) => (
            <li {...props}>
              <FlexBox
                gap={2}
                justifyBetween
                fullWidth
                sx={{
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}
              >
                <FlexBox
                  col
                  sx={{ maxWidth: '200px', overflow: 'hidden' }}
                  tooltipPlacement="right"
                  title={
                    checkOverflow(option) ? (
                      <OverFlowTooltip
                        parent={option.parent}
                        name={option.name}
                      />
                    ) : undefined
                  }
                >
                  <FlexBox gap={1 / 2} alignCenter>
                    {option.provider === Integration.GITHUB ? (
                      <GitHub sx={{ fontSize: '14px' }} />
                    ) : (
                      <GitlabIcon height={12} width={12} />
                    )}
                    <Line tiny>
                      {addEllipsis(option.parent, MAX_LENGTH_PARENT_NAME)}
                    </Line>
                  </FlexBox>
                  <Line>{addEllipsis(option.name, MAX_LENGTH_REPO_NAME)}</Line>
                </FlexBox>
                {selected ? <Close fontSize="small" /> : null}
              </FlexBox>
            </li>
          )}
          renderTags={() => null}
        />
      </FlexBox>
      <DisplayRepos />
    </FlexBox>
  );
};

const ActionTray: FC<CRUDProps> = ({
  onSave: onSaveCallBack,
  onDiscard: onDiscardCallBack
}) => {
  const {
    onSave,
    isSaveLoading,
    teamName,
    selectedRepos,
    onDiscard,
    saveDisabled
  } = useTeamCRUD();
  const { enqueueSnackbar } = useSnackbar();

  return (
    <FlexBox gap2>
      <FlexBox
        onClick={() => {
          if (!teamName) {
            return enqueueSnackbar('Please enter a team name', {
              variant: 'error',
              autoHideDuration: 2000
            });
          }
          if (!selectedRepos.length) {
            return enqueueSnackbar('Please select at least one repository', {
              variant: 'error',
              autoHideDuration: 2000
            });
          }
        }}
      >
        <Button
          disabled={saveDisabled}
          variant="contained"
          onClick={() => onSave(onSaveCallBack)}
          sx={{
            minWidth: '200px',
            '&.Mui-disabled': {
              borderColor: 'secondary.light'
            }
          }}
        >
          {isSaveLoading ? <CircularProgress size={'18px'} /> : 'Save'}
        </Button>
      </FlexBox>
      <Button
        variant="outlined"
        sx={{ minWidth: '200px' }}
        disabled={isSaveLoading}
        onClick={() => {
          onDiscard(onDiscardCallBack);
        }}
      >
        Discard
      </Button>
    </FlexBox>
  );
};

const DisplayRepos: FC = () => {
  const { selectedRepos, showWorkflowChangeWarning, unselectRepo } =
    useTeamCRUD();

  const theme = useTheme();
  if (!selectedRepos.length) return;
  return (
    <TableContainer
      sx={{
        border: `2px solid ${theme.colors.secondary.light}`,
        borderRadius: 1
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ px: 2, minWidth: 200 }}>Repo</TableCell>
            <TableCell sx={{ p: 1 }}>Deployed Via</TableCell>
            <TableCell align="center" sx={{ p: 1 }}>
              Action
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {selectedRepos.map((repo) => {
            const shortenedName = trimWithEllipsis(repo.name, 40);
            return (
              <TableRow key={repo.id}>
                <TableCell sx={{ px: 2 }}>
                  <FlexBox
                    title={shortenedName === repo.name ? null : repo.name}
                    gap1
                    alignCenter
                  >
                    {repo.provider === Integration.GITHUB ? (
                      <GitHub sx={{ fontSize: '16px' }} />
                    ) : (
                      <GitlabIcon height={14} width={14} />
                    )}
                    {shortenedName}
                  </FlexBox>
                </TableCell>
                <TableCell sx={{ px: 1, minWidth: 200 }}>
                  <FlexBox gap2 alignCenter>
                    <DeploymentSourceSelector repo={repo} />{' '}
                    {repo.deployment_type === DeploymentSources.WORKFLOW && (
                      <DeploymentWorkflowSelector repo={repo} />
                    )}
                  </FlexBox>
                </TableCell>
                <TableCell>
                  <FlexBox
                    title="Delete repo"
                    pointer
                    sx={{ px: 1 }}
                    justifyCenter
                    alignCenter
                    onClick={() => {
                      unselectRepo(repo.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" color="error" />
                  </FlexBox>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        {showWorkflowChangeWarning && (
          <TableRow>
            <TableCell colSpan={3}>
              <FlexBox alignCenter gap={1 / 2}>
                <InfoIcon color="primary" fontSize="small" />
                <Line color="primary" italic>
                  Workflow selection for any repositories will apply to all
                  teams where they are assigned.
                </Line>
              </FlexBox>
            </TableCell>
          </TableRow>
        )}
      </Table>
    </TableContainer>
  );
};

const options = [
  {
    label: 'PR Merge',
    value: DeploymentSources.PR_MERGE,
    title: 'This repo considers merges as deployments for this team'
  },
  {
    label: 'Workflow',
    value: DeploymentSources.WORKFLOW,
    title: 'This repo is deployed via CI for this team'
  }
];

const DeploymentSourceSelector: FC<{ repo: BaseRepo }> = ({ repo }) => {
  const open = useBoolState(false);
  const deploySource = repo.deployment_type;
  const { updateDeploymentTypeForRepo } = useTeamCRUD();
  return (
    <FormControl>
      <FlexBox
        col
        title={
          repo.provider === Integration.GITLAB ? (
            <Line>Gitlab repos only support PR merge deployments</Line>
          ) : (
            ''
          )
        }
      >
        <InputLabel>Source</InputLabel>
        <Select
          disabled={repo.provider === Integration.GITLAB}
          value={deploySource}
          onChange={() => {}}
          size="small"
          input={<OutlinedInput label="Source" margin="dense" />}
        >
          {options.map((source) => {
            return (
              <MenuItem
                value={source.value}
                key={source.value}
                onClick={async () => {
                  updateDeploymentTypeForRepo(repo.id, source.value);

                  open.false();
                }}
              >
                <Line fontSize={'14px'}>{source.label}</Line>
              </MenuItem>
            );
          })}
        </Select>
      </FlexBox>
    </FormControl>
  );
};
