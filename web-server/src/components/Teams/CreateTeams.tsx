import { Close } from '@mui/icons-material';
import {
  Autocomplete,
  Button,
  Card,
  CircularProgress,
  TextField
} from '@mui/material';

import {
  useTeamCRUD,
  TeamsCRUDProvider
} from '@/components/Teams/useTeamsConfig';

import { FlexBox } from '../FlexBox';
import { Line } from '../Text';

export const CreateTeams = () => {
  return (
    <TeamsCRUDProvider>
      <FlexBox
        gap={4}
        col
        justifyBetween
        component={Card}
        p={2}
        maxWidth={'900px'}
      >
        <FlexBox col>
          <Line huge semibold>
            Create a Team
          </Line>
          <Line>Create a team to generate metric insights</Line>
        </FlexBox>
        <TeamName />
        <TeamRepos />
        <ActionTray />
      </FlexBox>
    </TeamsCRUDProvider>
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
    <FlexBox col gap={2} relative>
      <FlexBox col>
        <Line big semibold>
          Add Repositories
        </Line>
        <Line>Select repositories for this team</Line>
      </FlexBox>
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
    </FlexBox>
  );
};

const ActionTray = () => {
  const { onSave, isSaveLoading } = useTeamCRUD();

  return (
    <FlexBox>
      <Button
        disabled={isSaveLoading}
        variant="contained"
        onClick={() => onSave()}
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
  );
};
