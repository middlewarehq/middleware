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
  OutlinedInput,
  IconButton,
  Box,
  Pagination
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { FC, useCallback, useMemo, useState } from 'react';

import {
  useTeamCRUD,
  TeamsCRUDProvider
} from '@/components/Teams/useTeamsConfig';
import { DeploymentWorkflowSelector } from '@/components/WorkflowSelector';
import { Integration } from '@/constants/integrations';
import { useModal } from '@/contexts/ModalContext';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import GitlabIcon from '@/mocks/icons/gitlab.svg';
import { BaseRepo, DeploymentSources } from '@/types/resources';
import { trimWithEllipsis } from '@/utils/stringFormatting';

import { BatchImportModal } from './BatchImportModal';

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
  const { addModal, closeModal } = useModal();

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

  const openBatchImportModal = useCallback(() => {
    const modal = addModal({
      title: 'Batch Import Repositories',
      body: (
        <BatchImportModal
          existing={selectedRepos}
          onAdd={(batch) => {
            const merged = [...selectedRepos, ...batch];
            const uniqueById = Array.from(
              new Map(merged.map((repo) => [repo.id, repo])).values()
            );
            handleRepoSelectionChange({} as any, uniqueById);
            closeModal(modal.key);
          }}
          onClose={() => closeModal(modal.key)}
        />
      ),
      showCloseIcon: true
    });
  }, [addModal, closeModal, selectedRepos, handleRepoSelectionChange]);

  return (
    <FlexBox col gap={2}>
      <FlexBox col>
        <Line big semibold>
          Add Repositories
        </Line>
        <Line>Select repositories for this team using name or link</Line>
      </FlexBox>
      <Box display="flex" alignItems="center" gap={2}>
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
          getOptionLabel={(option) => option.web_url}
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
        <Line small italic color="textSecondary">
          or
        </Line>
        <Button
          variant="outlined"
          onClick={openBatchImportModal}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Import Bulk Repositories
        </Button>
      </Box>
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

  const ROWS_PER_PAGE = 8;
  const [page, setPage] = useState(1);
  const total = selectedRepos.length;
  const pageCount = Math.ceil(total / ROWS_PER_PAGE);
  const paged = useMemo(
    () => selectedRepos.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE),
    [selectedRepos, page]
  );

  if (!total) return null;

  return (
    <FlexBox col gap={2}>
      <TableContainer
        sx={{
          border: `2px solid ${theme.colors.secondary.light}`,
          borderRadius: 1
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ px: 2 }}>Repo</TableCell>
              <TableCell sx={{ px: 1 }}>Deployed Via</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((repo) => {
              const name = trimWithEllipsis(repo.name, 40);
              return (
                <TableRow key={repo.id}>
                  <TableCell sx={{ px: 2 }}>
                    <FlexBox
                      gap1
                      alignCenter
                      title={repo.name !== name ? repo.name : undefined}
                    >
                      {repo.provider === Integration.GITHUB ? (
                        <GitHub />
                      ) : (
                        <GitlabIcon height={14} width={14} />
                      )}
                      {name}
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
                  <TableCell align="right">
                    <IconButton
                      onClick={() => unselectRepo(repo.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {showWorkflowChangeWarning && (
              <TableRow>
                <TableCell colSpan={3}>
                  <FlexBox alignCenter gap={1 / 2}>
                    <InfoIcon fontSize="small" />
                    <Line italic>
                      Workflow changes will apply to all teams using these
                      repos.
                    </Line>
                  </FlexBox>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {pageCount > 1 && (
        <Box display="flex" justifyContent="center">
          <Pagination
            page={page}
            count={pageCount}
            onChange={(_, p) => setPage(p)}
            size="small"
          />
        </Box>
      )}
    </FlexBox>
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
            <Line>Gitlab repos only support PR merge deployments for now</Line>
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
