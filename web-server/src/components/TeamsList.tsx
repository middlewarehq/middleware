import { Add, Delete, Edit, MoreVert } from '@mui/icons-material';
import {
  Button,
  Card,
  Divider,
  Menu,
  MenuItem,
  TextField
} from '@mui/material';
import { useSnackbar } from 'notistack';
import pluralize from 'pluralize';
import { ascend } from 'ramda';
import { FC, MouseEventHandler, useCallback, useMemo } from 'react';

import { Integration } from '@/constants/integrations';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { deleteTeam, fetchTeams } from '@/slices/team';
import { useDispatch, useSelector } from '@/store';
import { Team } from '@/types/api/teams';
import { depFn } from '@/utils/fn';

import { FlexBox } from './FlexBox';
import { useOverlayPage } from './OverlayPageContext';
import { CreateEditTeams } from './Teams/CreateTeams';
import { Line } from './Text';

type TeamCardProps = {
  team: Team;
  onEdit: () => void;
};

const VISIBLE_REPOS_COUNT = 3;

export const TeamsList = () => {
  const teamsArray = useSelector((state) => state.team.teams);
  const searchQuery = useEasyState('');

  const teamsArrayFiltered = useMemo(() => {
    if (!searchQuery.value) {
      return teamsArray;
    }
    return teamsArray.filter((team) =>
      team.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }, [searchQuery.value, teamsArray]);

  const showCreate = useBoolState(false);
  const showCreateTeam = useCallback(() => {
    depFn(showCreate.toggle);
  }, [showCreate.toggle]);

  return (
    <>
      <SearchFilter
        searchQuery={searchQuery.value}
        onChange={searchQuery.set}
        showCreateTeam={showCreateTeam}
        showCreate={showCreate.value}
      />
      {!teamsArrayFiltered.length && teamsArray.length ? (
        <FlexBox fullWidth>
          <Line secondary>No teams found</Line>
        </FlexBox>
      ) : null}
      <FlexBox gap={4} grid gridTemplateColumns={'1fr 1fr '} maxWidth={'900px'}>
        {teamsArrayFiltered.map((team, index) => (
          <TeamCard onEdit={showCreate.false} key={index} team={team} />
        ))}
      </FlexBox>
    </>
  );
};

const SearchFilter: FC<{
  searchQuery: string;
  onChange: (value: string) => void;
  showCreateTeam: () => void;
  showCreate: boolean;
}> = ({ searchQuery, onChange, showCreateTeam, showCreate }) => {
  return (
    <FlexBox col gap={4}>
      <FlexBox width={'900px'} gap={4}>
        <FlexBox flex1>
          <TextField
            value={searchQuery}
            onChange={(e) => {
              onChange(e.target.value);
            }}
            fullWidth
            placeholder="Search for teams"
          />
        </FlexBox>
        <FlexBox flex1 alignCenter gap={4}>
          <FlexBox flex1>
            <Button
              onClick={showCreateTeam}
              sx={{ width: '100%' }}
              variant="outlined"
            >
              <FlexBox centered gap1 fullWidth p={2 / 3}>
                <Add fontSize="small" /> Add new team
              </FlexBox>
            </Button>
          </FlexBox>
          <FlexBox flex1>
            <Button
              href={ROUTES.DORA_METRICS.PATH}
              sx={{ width: '100%' }}
              variant="contained"
            >
              <FlexBox centered fullWidth p={2 / 3}>
                Continue to Dora {'->'}
              </FlexBox>
            </Button>
          </FlexBox>
        </FlexBox>
      </FlexBox>
      {showCreate && <CreateEditTeams onDiscard={showCreateTeam} />}
    </FlexBox>
  );
};

const TeamCard: React.FC<TeamCardProps> = ({ team, onEdit }) => {
  const { name: teamName, id: teamId } = team;
  const teamReposMap = useSelector((state) => state.team.teamReposMaps);
  const assignedReposToTeam = useMemo(
    () => [...(teamReposMap[teamId] ?? [])]?.sort(ascend((item) => item.name)),
    [teamId, teamReposMap]
  );
  const visibleReposName = assignedReposToTeam.slice(0, VISIBLE_REPOS_COUNT);

  const tooltipRepos = useMemo(
    () =>
      assignedReposToTeam
        .slice(VISIBLE_REPOS_COUNT)
        .map((item) => item.name)
        .join(', '),
    [assignedReposToTeam]
  );

  return (
    <FlexBox component={Card} p={2} minHeight={'144px'} gap2>
      <FlexBox fullWidth col gap2 justifyBetween>
        <FlexBox col gap2>
          <FlexBox justifyBetween alignStart>
            <Line big semibold>
              {teamName}
            </Line>
          </FlexBox>

          <FlexBox gap2 alignCenter minHeight={'64px'}>
            <FlexBox gap1 alignCenter>
              <Line bigish bold sx={{ whiteSpace: 'nowrap' }}>
                {assignedReposToTeam.length}{' '}
                {pluralize('Repo', assignedReposToTeam.length)} Added
              </Line>
            </FlexBox>
            {Boolean(assignedReposToTeam.length) && (
              <>
                <Divider orientation="vertical" flexItem />
                <FlexBox justifyBetween alignCenter fullWidth>
                  <Line secondary>
                    {visibleReposName.map((r) => r.name).join(', ')}{' '}
                    {assignedReposToTeam.length > VISIBLE_REPOS_COUNT && (
                      <FlexBox
                        inline
                        sx={{
                          userSelect: 'none'
                        }}
                        title={
                          <FlexBox maxWidth={'250px'}>{tooltipRepos}</FlexBox>
                        }
                      >
                        <Line info>
                          +{assignedReposToTeam.length - VISIBLE_REPOS_COUNT}{' '}
                          more
                        </Line>
                      </FlexBox>
                    )}
                  </Line>
                </FlexBox>
              </>
            )}
          </FlexBox>
        </FlexBox>
      </FlexBox>
      <FlexBox col justifyBetween height={'70px'}>
        <EditTeam teamId={teamId} onEdit={onEdit} />
        <FlexBox pointer>
          <MoreOptions teamId={team.id} />
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
};

const MoreOptions = ({ teamId }: { teamId: ID }) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { orgId } = useAuth();
  const anchorEl = useEasyState();
  const loading = useBoolState(false);
  const cancelMenu = useBoolState(false);

  const handleOpenMenu: MouseEventHandler<HTMLDivElement> = (event) => {
    anchorEl.set(event.currentTarget);
  };

  const handleCloseMenu = useCallback(() => {
    depFn(anchorEl.set, null);
  }, [anchorEl.set]);

  const handleTeamDeletion = useCallback(
    (teamId: ID) => {
      depFn(loading.true);
      dispatch(
        deleteTeam({
          org_id: orgId,
          team_id: teamId
        })
      )
        .then((res) => {
          if (res.meta.requestStatus === 'fulfilled') {
            enqueueSnackbar('Team deleted successfully', {
              variant: 'success',
              autoHideDuration: 2000
            });
            dispatch(
              fetchTeams({ org_id: orgId, provider: Integration.GITHUB })
            );
            handleCloseMenu();
          } else {
            enqueueSnackbar('Failed to delete team', {
              variant: 'error',
              autoHideDuration: 2000
            });
            console.error('Failed to delete team', res.meta);
          }
        })
        .finally(loading.false);
    },
    [
      dispatch,
      enqueueSnackbar,
      handleCloseMenu,
      loading.false,
      loading.true,
      orgId
    ]
  );

  return (
    <>
      <FlexBox onClick={handleOpenMenu}>
        <MoreVert />
      </FlexBox>
      <Menu
        id="team-setting-menu"
        anchorEl={anchorEl.value}
        keepMounted
        open={Boolean(anchorEl.value)}
        onClose={() => {
          handleCloseMenu();
          cancelMenu.false();
        }}
        MenuListProps={{
          'aria-labelledby': 'simple-menu',
          disablePadding: true,
          sx: {
            padding: 0
          }
        }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem>
          <FlexBox col width={'150px'} maxWidth={'150px'}>
            <FlexBox onClick={cancelMenu.true} gap1 alignCenter fullWidth>
              <Delete fontSize="small" color="error" />
              <Line semibold error>
                Delete team
              </Line>
            </FlexBox>
            {cancelMenu.value && (
              <FlexBox mt={1} col gap1>
                <Line
                  sx={{
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'normal'
                  }}
                >
                  Are you sure you want to delete this team? This action cannot
                  be undone.
                </Line>
                <FlexBox fullWidth justifyBetween gap2 my={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      cancelMenu.false();
                      handleCloseMenu();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      handleTeamDeletion(teamId);
                    }}
                  >
                    Delete
                  </Button>
                </FlexBox>
              </FlexBox>
            )}
          </FlexBox>
        </MenuItem>
      </Menu>
    </>
  );
};

const EditTeam = ({ teamId, onEdit }: { teamId: ID; onEdit: () => void }) => {
  const { addPage, removeAll } = useOverlayPage();
  return (
    <FlexBox title={'Edit team'} pointer ml={1 / 2}>
      <Edit
        fontSize="small"
        onClick={() => {
          onEdit();
          addPage({
            page: {
              title: 'Edit team',
              ui: 'team_edit',
              props: {
                teamId,
                onDiscard: removeAll
              }
            }
          });
        }}
      />
    </FlexBox>
  );
};
