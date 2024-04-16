import { Delete, MoreVert } from '@mui/icons-material';
import Edit from '@mui/icons-material/Edit';
import { Button, Card, Divider, Menu, MenuItem } from '@mui/material';
import pluralize from 'pluralize';
import { MouseEventHandler } from 'react';

import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { useSelector } from '@/store';
import { Team } from '@/types/api/teams';

import { FlexBox } from './FlexBox';
import { Line } from './Text';

type TeamCardProps = {
  team: Team;
};

const VISIBLE_REPOS_COUNT = 3;

export const TeamsList = () => {
  const teamsArray = useSelector((state) => state.team.teams);

  return (
    <FlexBox gap={4} grid gridTemplateColumns={'1fr 1fr 1fr'}>
      {teamsArray.map((team, index) => (
        <TeamCard key={index} team={team} />
      ))}
    </FlexBox>
  );
};

const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  const { name: teamName, id: teamId } = team;
  const teamReposMap = useSelector((state) => state.team.teamReposMaps);
  const assignedReposToTeam = teamReposMap[teamId] ?? [];
  const visibleReposName = assignedReposToTeam.slice(0, VISIBLE_REPOS_COUNT);

  return (
    <FlexBox component={Card} gap2 p={2} col justifyBetween>
      <FlexBox col gap2>
        <FlexBox justifyBetween alignStart>
          <Line big semibold>
            {teamName}
          </Line>
          <FlexBox pointer>
            <MoreOptions teamId={team.id} />
          </FlexBox>
        </FlexBox>

        <FlexBox gap2 alignCenter>
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
                  {visibleReposName.map(
                    (r, idx) =>
                      `${r.name} ${
                        idx === visibleReposName.length - 1 ? '' : ', '
                      }`
                  )}
                  {assignedReposToTeam.length > VISIBLE_REPOS_COUNT && (
                    <Line info>
                      +{assignedReposToTeam.length - VISIBLE_REPOS_COUNT} more
                    </Line>
                  )}
                </Line>
                <FlexBox title={'Edit team'} pointer ml={1 / 2}>
                  <Edit
                    fontSize="small"
                    onClick={() => {
                      // TODO: IMPLEMENT EDIT TEAM
                      //   disableCreation();
                      //   addPage({
                      //     page: {
                      //       title: `Editing team: ${team.name}`,
                      //       ui: 'team_edit',
                      //       props: { teamId: team.id }
                      //     }
                      //   });
                    }}
                  />
                </FlexBox>
              </FlexBox>
            </>
          )}
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
};

const MoreOptions = ({ teamId }: { teamId: ID }) => {
  const anchorEl = useEasyState();

  const handleOpenMenu: MouseEventHandler<HTMLDivElement> = (event) => {
    anchorEl.set(event.currentTarget);
  };

  const handleCloseMenu = () => {
    anchorEl.set(null);
  };

  const cancelMenu = useBoolState(false);

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
                      // TODO: IMPLEMENT DELETE TEAM
                      //   handleTeamDeletion(teamId);
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
