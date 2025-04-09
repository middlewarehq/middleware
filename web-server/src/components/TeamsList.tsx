import { Add, Delete, Edit, MoreVert } from '@mui/icons-material';
import {
  Button,
  Card,
  Divider,
  Avatar,
  AvatarGroup,
  Menu,
  MenuItem,
  TextField
} from '@mui/material';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import pluralize from 'pluralize';
import { ascend } from 'ramda';
import { FC, MouseEventHandler, useCallback, useEffect, useMemo } from 'react';
import { truncate } from 'voca';

import DoraIcon from '@/assets/dora-icon.svg';
import { ROUTES } from '@/constants/routes';
import { FetchState } from '@/constants/ui-states';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { appSlice } from '@/slices/app';
import { deleteTeam, fetchTeams } from '@/slices/team';
import { useDispatch, useSelector } from '@/store';
import { Team } from '@/types/api/teams';
import { depFn } from '@/utils/fn';

import { FlexBox } from './FlexBox';
import { useOverlayPage } from './OverlayPageContext';
import { CreateEditTeams } from './Teams/CreateTeams';
import { Loader } from './Teams/CreateTeams';
import { Line } from './Text';

const VISIBLE_REPOS_COUNT = 3;
const HORIZONTAL_SPACE = 3 / 2;

export const TeamsList = () => {
  const teamsArray = useSelector((state) => state.team.teams);
  const searchQuery = useEasyState('');
  const router = useRouter();
  const dispatch = useDispatch();
  const showCreate = useBoolState(false);

  const teamsArrayFiltered = useMemo(() => {
    if (!searchQuery.value) {
      return teamsArray;
    }
    return teamsArray.filter((team) =>
      team.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }, [searchQuery.value, teamsArray]);

  const handleShowCreateTeam = useCallback(() => {
    depFn(showCreate.toggle);
  }, [showCreate.toggle]);

  const isLoadingTeams = useSelector(
    (state) => state.team?.requests?.teams === FetchState.REQUEST
  );

  const handleTeamView = (team: Team) => {
    if (team) {
      dispatch(appSlice.actions.setSingleTeam([team]));
    }
    const path = ROUTES.DORA_METRICS.PATH;
    router.push(path);
  };

  useEffect(() => {
    if (router.query.create === 'true') {
      depFn(showCreate.true);
      router.replace(router.pathname, '');
    }
  }, [router, showCreate.true]);

  return (
    <>
      <SearchFilter
        searchQuery={searchQuery.value}
        onChange={searchQuery.set}
        handleShowCreateTeam={handleShowCreateTeam}
        showCreate={showCreate.value}
      />
      {!teamsArrayFiltered.length && teamsArray.length ? (
        <FlexBox fullWidth>
          <Line secondary>No teams found</Line>
        </FlexBox>
      ) : null}
      <FlexBox relative>
        <FlexBox
          gap={HORIZONTAL_SPACE}
          grid
          gridTemplateColumns={'1fr 1fr'}
          width={'900px'}
          relative
          sx={{
            filter: isLoadingTeams ? 'blur(2px)' : 'none',
            opacity: isLoadingTeams ? 0.5 : 1,
            transition: 'all 0.2s linear'
          }}
        >
          {teamsArrayFiltered.map((team, index) => (
            <TeamCard
              onEdit={showCreate.false}
              key={index}
              team={team}
              onView={handleTeamView}
            />
          ))}
        </FlexBox>
        {isLoadingTeams && (
          <FlexBox
            fullWidth
            height={'100%'}
            sx={{ position: 'absolute' }}
            top={0}
            left={0}
            p={2}
          >
            <FlexBox sx={{ position: 'absolute' }} top={0} left={0} p={2}>
              <Loader />
            </FlexBox>
          </FlexBox>
        )}
      </FlexBox>
    </>
  );
};

const SearchFilter: FC<{
  searchQuery: string;
  onChange: (value: string) => void;
  handleShowCreateTeam: () => void;
  showCreate: boolean;
}> = ({ searchQuery, onChange, handleShowCreateTeam, showCreate }) => {
  return (
    <FlexBox col gap={4}>
      <FlexBox width={'900px'} gap={HORIZONTAL_SPACE}>
        <FlexBox flex1>
          <TextField
            size="small"
            value={searchQuery}
            onChange={(e) => {
              onChange(e.target.value);
            }}
            fullWidth
            InputProps={{
              sx: {
                padding: '3px'
              }
            }}
            placeholder="Search"
          />
        </FlexBox>
        <FlexBox flex1 alignCenter gap={HORIZONTAL_SPACE}>
          <FlexBox flex1>
            <Button
              onClick={handleShowCreateTeam}
              variant="outlined"
              color="secondary"
              sx={{
                bgcolor: 'transparent',
                width: '100%'
              }}
            >
              <FlexBox centered gap1 fullWidth>
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
              <FlexBox centered fullWidth>
                Continue to Dora {'->'}
              </FlexBox>
            </Button>
          </FlexBox>
        </FlexBox>
      </FlexBox>
      {showCreate && (
        <CreateEditTeams
          onDiscard={handleShowCreateTeam}
          onSave={handleShowCreateTeam}
        />
      )}
    </FlexBox>
  );
};

type TeamCardProps = {
  team: Team;
  onEdit: () => void;
  onView: (team: Team) => void;
};

const TeamCard: React.FC<TeamCardProps> = ({ team, onEdit, onView }) => {
  const { name: teamName, id: teamId } = team;
  const teamReposMap = useSelector((state) => state.team.teamReposMaps);
  const assignedReposToTeam = useMemo(
    () => [...(teamReposMap[teamId] ?? [])]?.sort(ascend((item) => item.name)),
    [teamId, teamReposMap]
  );
  const visibleReposName = assignedReposToTeam.slice(0, VISIBLE_REPOS_COUNT);

  const renderVisibleRepos = (
    <FlexBox alignCenter gap={1}>
      <AvatarGroup
        max={VISIBLE_REPOS_COUNT}
        sx={{
          marginRight: 1,
          '& .MuiAvatar-root': {
            border: '1px solid #f0f0f0',
            width: 28,
            height: 28
          }
        }}
      >
        {visibleReposName.map((repo) => (
          <Avatar
            key={repo.id || repo.name}
            src={`https://github.com/${repo.org_name}.png?size=28`}
          />
        ))}
      </AvatarGroup>
      <Line secondary sx={{ fontSize: '0.85rem' }}>
        {visibleReposName.map((repo) => repo.name).join(', ')}
      </Line>
    </FlexBox>
  );

  const tooltipRepos = useMemo(
    () =>
      assignedReposToTeam
        .slice(VISIBLE_REPOS_COUNT)
        .map((item) => item.name)
        .join(', '),
    [assignedReposToTeam]
  );

  const minifiedName = useMemo(() => {
    return truncate(teamName, 25);
  }, [teamName]);

  return (
    <FlexBox
      component={Card}
      p={2.5}
      minHeight={'150px'}
      sx={{
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }
      }}
    >
      <FlexBox fullWidth col gap={2} flex={1}>
        <FlexBox justifyBetween alignCenter>
          <FlexBox
            title={minifiedName === teamName ? null : teamName}
            tooltipPlacement="right"
            alignCenter
            gap={1}
          >
            <Line big semibold sx={{ color: 'primary.dark' }}>
              {minifiedName}
            </Line>
          </FlexBox>
          <FlexBox gap={1}>
            <EditTeam teamId={teamId} onEdit={onEdit} />
            <MoreOptions teamId={team.id} />
          </FlexBox>
        </FlexBox>

        <Divider />

        <FlexBox col gap={2} flex={1}>
          <FlexBox gap={1} alignCenter>
            <Line bigish bold sx={{ color: 'text.primary' }}>
              {assignedReposToTeam.length}{' '}
              {pluralize('Repository', assignedReposToTeam.length)}
            </Line>
          </FlexBox>

          {Boolean(assignedReposToTeam.length) && (
            <FlexBox col gap={1}>
              {renderVisibleRepos}

              {assignedReposToTeam.length > VISIBLE_REPOS_COUNT && (
                <FlexBox
                  inline
                  sx={{
                    userSelect: 'none',
                    mr: 20
                  }}
                  title={<FlexBox maxWidth={'250px'}>{tooltipRepos}</FlexBox>}
                >
                  <Line info sx={{ ml: 10 }}>
                    +{assignedReposToTeam.length - VISIBLE_REPOS_COUNT} more
                  </Line>
                </FlexBox>
              )}
            </FlexBox>
          )}
        </FlexBox>

        <FlexBox justifyCenter mt={1}>
          <Button
            sx={{ width: '100%' }}
            variant="contained"
            onClick={() => onView(team)}
            startIcon={<DoraIcon style={{ width: 20, height: 20 }} />}
          >
            View DORA Metrics
          </Button>
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
            dispatch(fetchTeams({ org_id: orgId }));
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
          <FlexBox
            col
            width={'150px'}
            maxWidth={'150px'}
            pt={Number(cancelMenu.value)}
          >
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
  const { addPage } = useOverlayPage();
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
                teamId
              }
            }
          });
        }}
      />
    </FlexBox>
  );
};
