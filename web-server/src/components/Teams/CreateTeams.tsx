import { Close } from '@mui/icons-material';
import {
  Autocomplete,
  Button,
  Card,
  CircularProgress,
  TextField
} from '@mui/material';
import { SyntheticEvent } from 'react';

import {
  useTeamCRUD,
  TeamsCRUDProvider
} from '@/components/Teams/useTeamsConfig';
import { useEasyState } from '@/hooks/useEasyState';
import { updateTeamReposProductionBranches } from '@/slices/team';
import { useDispatch } from '@/store';
import { BaseRepo } from '@/types/resources';

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
  const { orgRepos } = useTeamCRUD();
  const selections = useEasyState<BaseRepo[]>([]);
  const options = orgRepos;
  const selectedValues = selections.value;
  const handleSelectionChange = (
    _: SyntheticEvent<Element, Event>,
    value: BaseRepo[]
  ) => {
    selections.set(value);
  };
  const teamRepoError = false;
  return (
    <FlexBox col gap={2} relative>
      <FlexBox col>
        <Line big semibold>
          Add Repositories
        </Line>
        <Line>Select repositories for this team</Line>
      </FlexBox>
      <Autocomplete
        disableCloseOnSelect
        disableClearable
        sx={{ width: '260px', height: '48px', minWidth: '260px' }}
        multiple
        options={options}
        value={selectedValues}
        onChange={handleSelectionChange}
        getOptionLabel={(option) => option.name}
        renderInput={(params) => (
          <TextField
            {...params}
            label={`${selectedValues.length} selected`}
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
  const isSaveLoading = false;
  const disabledSave = false;
  const dispatch = useDispatch();
  const onSave = () => {
    dispatch(
      updateTeamReposProductionBranches({
        team_id: 'team_id',
        team_repos_data: []
      })
    );
  };
  return (
    <FlexBox>
      <Button
        disabled={disabledSave || isSaveLoading}
        variant="contained"
        onClick={onSave}
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
