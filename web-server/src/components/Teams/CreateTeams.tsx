import { Close } from '@mui/icons-material';
import {
  Autocomplete,
  Button,
  Card,
  CircularProgress,
  Divider,
  TextField
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { FC } from 'react';

import {
  useTeamCRUD,
  TeamsCRUDProvider
} from '@/components/Teams/useTeamsConfig';
import { BaseRepo } from '@/types/resources';

import { FlexBox } from '../FlexBox';
import { Line } from '../Text';

type CRUDProps = {
  onSave?: AnyFunction;
  onDiscard?: AnyFunction;
  teamId?: ID;
};

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

export const TeamsCRUD: FC<CRUDProps> = ({ onSave, onDiscard }) => {
  const { isPageLoading } = useTeamCRUD();
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
          <Heading />
          <TeamName />
          <TeamRepos />
          <ActionTray onDiscard={onDiscard} onSave={onSave} />
        </FlexBox>
      )}
    </>
  );
};

const Loader = () => {
  return (
    <FlexBox alignCenter gap2>
      <CircularProgress size="20px" />
      <Line>Loading...</Line>
    </FlexBox>
  );
};

const Heading = () => {
  const { isEditing, editingTeam } = useTeamCRUD();
  const heading = isEditing ? 'Edit' : 'Create';

  return (
    <FlexBox col>
      <Line huge semibold>
        {heading} a Team
      </Line>
      {isEditing ? (
        <Line>
          Currently editing{' '}
          <Line info semibold>
            {editingTeam.name}
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

const TeamRepos = () => {
  const {
    repoOptions,
    teamRepoError,
    handleRepoSelectionChange,
    selectedRepos,
    raiseTeamRepoError
  } = useTeamCRUD();

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
          onBlur={raiseTeamRepoError}
          disableCloseOnSelect
          disableClearable
          sx={{ width: '260px', height: '48px', minWidth: '260px' }}
          multiple
          options={repoOptions}
          value={selectedRepos}
          onChange={handleRepoSelectionChange}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => (
            <TextField
              {...params}
              label={`${selectedRepos.length} selected`}
              error={teamRepoError}
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
                <Line sx={{ maxWidth: '200px', overflow: 'hidden' }}>
                  {option.name}
                </Line>
                {selected ? <Close fontSize="small" /> : null}
              </FlexBox>
            </li>
          )}
          renderTags={() => null}
        />
        <DisplayRepos />
      </FlexBox>
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
        onClick={() => {
          onDiscard(onDiscardCallBack);
        }}
      >
        Discard
      </Button>
    </FlexBox>
  );
};

const DisplayRepos = () => {
  const { selectedRepos } = useTeamCRUD();
  return (
    <FlexBox gap2 ml={2} minHeight={'49px'}>
      {!!selectedRepos.length && <Divider flexItem orientation="vertical" />}
      <FlexBox flexWrap={'wrap'} gap2>
        {selectedRepos.map((repo) => (
          <RepoItem repo={repo} key={repo.id} />
        ))}
      </FlexBox>
    </FlexBox>
  );
};

const RepoItem: FC<{ repo: BaseRepo }> = ({ repo }) => {
  const { unselectRepo } = useTeamCRUD();
  return (
    <FlexBox height={'49px'} component={Card} gap={2} alignCenter px={2}>
      {repo.name}{' '}
      <FlexBox
        pointer
        onClick={() => {
          unselectRepo(repo.id);
        }}
        title="Remove repo"
        sx={{
          '&:hover': {
            filter: 'brightness(0.7)'
          },
          transition: 'filter 0.2s'
        }}
      >
        <Close fontSize="small" />
      </FlexBox>
    </FlexBox>
  );
};
