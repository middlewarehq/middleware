import {
  CheckCircleOutlineRounded,
  RadioButtonUnchecked,
  RadioButtonChecked,
  SearchRounded,
  ClearRounded,
  Edit
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  CircularProgress,
  Divider,
  InputAdornment,
  MenuItem,
  Popover,
  Stack,
  SxProps,
  TextField,
  Typography,
  useTheme
} from '@mui/material';
import Link from 'next/link';
import pluralize from 'pluralize';
import {
  FC,
  useCallback,
  MutableRefObject,
  Dispatch,
  SetStateAction
} from 'react';
import { useDispatch } from 'react-redux';

import { FlexBox, FlexBoxProps } from '@/components/FlexBox';
import Scrollbar from '@/components/Scrollbar';
import { MenuListWrapperSecondary } from '@/components/Shared';
import IntegrationsData from '@/components/TeamSelector/integrations-data.svg';
import TeamData from '@/components/TeamSelector/team-data.svg';
import { Line } from '@/components/Text';
import { track } from '@/constants/events';
import { ROUTES } from '@/constants/routes';
import { useActiveRouteEvent } from '@/hooks/useActiveRouteEvent';
import { BoolState, useBoolState, useEasyState } from '@/hooks/useEasyState';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { appSlice, updateTeamMemberDataSetting } from '@/slices/app';
import { useSelector } from '@/store';
import { Team } from '@/types/api/teams';
import { UserWithAvatar } from '@/types/resources';
import { homogenize } from '@/utils/datatype';
import { depFn } from '@/utils/fn';

import { defaultPopoverProps } from './defaultPopoverProps';

import { useOverlayPage } from '../OverlayPageContext';

export const TeamPopover: FC<{
  teamElRef: MutableRefObject<any>;
  teamsPop: BoolState;
  showAllTeams: boolean;
  loadingTeams: boolean;
  isSingleMode: boolean;
  hideTeamMemberFilter: boolean;
  setShowAllTeams: Dispatch<SetStateAction<boolean>>;
  teams: Team[];
  apiTeams: Team[];
  usersMap: Record<string, UserWithAvatar>;
  setProdBranchNamesByTeamId: (teamId: string) => void;
  closeOnSelect?: boolean;
}> = ({
  teamElRef,
  teamsPop,
  showAllTeams,
  setShowAllTeams,
  apiTeams,
  teams,
  loadingTeams,
  setProdBranchNamesByTeamId,
  isSingleMode,
  hideTeamMemberFilter,
  closeOnSelect
}) => {
  const theme = useTheme();
  const { team } = useSingleTeamConfig();
  const { addPage } = useOverlayPage();
  const updatingTeamMemberFilter = useBoolState();

  const isRoleEng = false;
  const activeRouteEvent = useActiveRouteEvent('APP_TEAM_CHANGE_SINGLE');
  const dispatch = useDispatch();

  const teamSearchFilter = useEasyState('');

  const toggleTeamMemberFilter = useCallback(
    (enabled: boolean) => {
      if (!team?.id) return;

      depFn(updatingTeamMemberFilter.trackAsync, async () =>
        dispatch(
          updateTeamMemberDataSetting({
            teamId: team?.id,
            enabled
          })
        )
      );
    },
    [dispatch, team?.id, updatingTeamMemberFilter.trackAsync]
  );

  const listFilteredBySearch = apiTeams.filter((team) =>
    teamSearchFilter.value
      ? homogenize(team.name).includes(homogenize(teamSearchFilter.value))
      : true
  );

  const teamReposMap = useSelector((s) => s.app.teamsProdBranchMap);

  return (
    <Popover
      anchorEl={teamElRef.current}
      onClose={teamsPop.false}
      open={teamsPop.value}
      {...defaultPopoverProps}
    >
      <FlexBox>
        <FlexBox col>
          <FlexBox
            alignCenter
            justifyBetween
            bgcolor={alpha(theme.colors.alpha.black[100], 0.06)}
            p={2}
            pb={1 / 2}
          >
            <FlexBox textAlign="center" centered fullWidth col gap1>
              <Box>
                <Typography variant="subtitle1" fontSize="small">
                  Currently showing all teams
                </Typography>
              </Box>
              {loadingTeams && <CustomLoadingButton />}
            </FlexBox>
          </FlexBox>
          <Divider />
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            divider={<Divider orientation="vertical" flexItem />}
            justifyContent="stretch"
            alignItems="stretch"
            spacing={0}
            height="100%"
          >
            <MenuListWrapperSecondary
              disablePadding
              sx={{ minWidth: '100%', height: '100%' }}
            >
              <Scrollbar
                autoHeight
                autoHeightMin={apiTeams.length > 3 ? '270px' : undefined}
              >
                {apiTeams.length ? (
                  <>
                    {Boolean(apiTeams.length > 4 || teamSearchFilter.value) && (
                      <>
                        <TextField
                          fullWidth
                          variant="outlined"
                          size="small"
                          placeholder="Search for a team..."
                          InputProps={{
                            startAdornment: (
                              <InputAdornment
                                position="start"
                                sx={{ ml: -1 / 2 }}
                              >
                                <SearchRounded />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment
                                position="end"
                                sx={{ mr: -1, cursor: 'pointer' }}
                                onClick={teamSearchFilter.reset}
                              >
                                <ClearRounded />
                              </InputAdornment>
                            )
                          }}
                          sx={{ mb: 1 / 2 }}
                          value={teamSearchFilter.value}
                          onChange={teamSearchFilter.eventHandler}
                        />
                        <Line
                          width="100%"
                          tiny
                          secondary
                          mb={1}
                          display="flex"
                          justifyContent="center"
                        >
                          {apiTeams.length} {pluralize('team', apiTeams.length)}{' '}
                          present
                          {listFilteredBySearch.length !== apiTeams.length
                            ? ` (${listFilteredBySearch.length} shown)`
                            : ''}
                        </Line>
                      </>
                    )}
                    {listFilteredBySearch.map((apiTeam) => {
                      const selected = teams.some(
                        (team) => team.id === apiTeam.id
                      );

                      return (
                        <MenuItem
                          key={apiTeam.id}
                          sx={{ maxWidth: '400px', borderRadius: 1 }}
                          selected={selected}
                          onClick={() => {
                            dispatch(appSlice.actions.setSingleTeam([apiTeam]));
                            setProdBranchNamesByTeamId(apiTeam.id);
                            track(activeRouteEvent, { team: apiTeam });
                            if (closeOnSelect) {
                              depFn(teamsPop.false);
                            }
                          }}
                        >
                          <Box display="flex" ml={-1} mr={1}>
                            {selected ? (
                              <Box
                                display="flex"
                                sx={{
                                  color: theme.colors.success.main,
                                  opacity: 0.8
                                }}
                              >
                                {!isSingleMode ? (
                                  <CheckCircleOutlineRounded />
                                ) : (
                                  <RadioButtonChecked />
                                )}
                              </Box>
                            ) : (
                              <RadioButtonUnchecked />
                            )}
                          </Box>

                          <Box
                            display="flex"
                            gap={2}
                            mr={1}
                            flex={1}
                            justifyContent="space-between"
                            overflow="hidden"
                          >
                            <Box overflow="hidden">
                              <FlexBox
                                alignCenter
                                gap={1 / 2}
                                fontSize={theme.spacing(1.8)}
                              >
                                <Box
                                  color="white"
                                  sx={{
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden'
                                  }}
                                >
                                  {apiTeam.name}
                                </Box>
                                {!isRoleEng && (
                                  <FlexBox
                                    alignCenter
                                    title={`Edit team: ${apiTeam.name}`}
                                    tooltipPlacement="right"
                                  >
                                    <Edit
                                      fontSize="small"
                                      onClick={() => {
                                        addPage({
                                          page: {
                                            title: 'Edit team',
                                            ui: 'team_edit',
                                            props: {
                                              teamId: apiTeam.id,
                                              hideCardComponents: true
                                            }
                                          }
                                        });
                                        teamsPop.false();
                                      }}
                                    />
                                  </FlexBox>
                                )}
                              </FlexBox>
                              {teamReposMap[apiTeam.id]?.length ? (
                                <Typography variant="subtitle1">
                                  {teamReposMap[apiTeam.id]?.length}{' '}
                                  {pluralize(
                                    'repo',
                                    teamReposMap[apiTeam.id]?.length || 0
                                  )}
                                </Typography>
                              ) : (
                                <Typography variant="subtitle1">
                                  No repos
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </>
                ) : !loadingTeams ? (
                  <FlexBox col fullWidth centered gap1>
                    <Line white>No teams to show</Line>
                    <Link href={ROUTES.TEAMS.PATH} passHref>
                      <Button size="small" variant="contained">
                        Add some?
                      </Button>
                    </Link>
                  </FlexBox>
                ) : (
                  'We getting your teams together, but someone seems missing 🤔'
                )}
              </Scrollbar>
            </MenuListWrapperSecondary>
          </Stack>
        </FlexBox>
        {!hideTeamMemberFilter && (
          <>
            <Divider orientation="vertical" />
            <FlexBox col>
              <FlexBox
                alignCenter
                justifyBetween
                bgcolor={alpha(theme.colors.alpha.black[100], 0.06)}
                p={2}
                pb={1 / 2}
              >
                <FlexBox textAlign="center" centered fullWidth col gap1>
                  <Button
                    size="small"
                    color="primary"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      width: '100%'
                    }}
                    onClick={() => setShowAllTeams(!showAllTeams)}
                  >
                    {team ? (
                      <Box>
                        <Typography variant="subtitle1" fontSize="small">
                          How would like to filter data for
                        </Typography>
                        <Typography variant="body1">
                          <Line bold display="inline">
                            {team?.name}
                          </Line>{' '}
                          team
                        </Typography>
                      </Box>
                    ) : (
                      <Box>
                        <Typography variant="subtitle1" fontSize="small">
                          Select a team
                        </Typography>
                      </Box>
                    )}
                  </Button>
                </FlexBox>
              </FlexBox>
              <Divider />
              <Stack
                direction="column"
                divider={<Divider orientation="vertical" flexItem />}
                justifyContent="stretch"
                alignItems="stretch"
                spacing={0}
                height="100%"
              >
                <MenuListWrapperSecondary
                  disablePadding
                  sx={{ minWidth: '100%', height: '100%' }}
                >
                  <FlexBox col flex1 gap1>
                    <MenuItem
                      sx={dataFilterMenuItemSx}
                      selected={true}
                      onClick={() => {
                        team.member_filter_enabled &&
                          toggleTeamMemberFilter(false);
                      }}
                    >
                      <DataFilterRadio
                        checked={!team.member_filter_enabled}
                        saving={
                          team.member_filter_enabled &&
                          updatingTeamMemberFilter.value
                        }
                      />

                      <DataFilterMenuItem>
                        <FlexBox
                          position="absolute"
                          right="-40px"
                          bottom="-30px"
                        >
                          <IntegrationsData
                            style={{ height: '90px', opacity: 0.4 }}
                          />
                        </FlexBox>
                        <Line bold>By Codebases/Projects</Line>
                        <Line tiny secondary>
                          Data for this team will be shown{' '}
                          <Line bold>for all its codebases/projects</Line>
                        </Line>
                        <Line tiny secondary>
                          Great for viewing team analytics
                          <br />
                          without onboarding all members
                        </Line>
                      </DataFilterMenuItem>
                    </MenuItem>
                    <MenuItem
                      sx={dataFilterMenuItemSx}
                      selected={true}
                      onClick={() => {
                        !team.member_filter_enabled &&
                          toggleTeamMemberFilter(true);
                      }}
                    >
                      <DataFilterRadio
                        checked={team.member_filter_enabled}
                        saving={
                          !team.member_filter_enabled &&
                          updatingTeamMemberFilter.value
                        }
                      />

                      <DataFilterMenuItem>
                        <FlexBox
                          position="absolute"
                          right="-60px"
                          bottom="-30px"
                        >
                          <TeamData style={{ height: '110px', opacity: 0.4 }} />
                        </FlexBox>
                        <Line bold>By Contributions/Assignees</Line>
                        <Line tiny secondary>
                          Data for this team will be shown{' '}
                          <Line bold>only for team members</Line> present in it
                        </Line>
                        <Line tiny secondary>
                          Great for{' '}
                          <Line info bold>
                            monorepos
                          </Line>
                          , and repos or projects with multi-team contributors
                        </Line>
                      </DataFilterMenuItem>
                    </MenuItem>
                  </FlexBox>
                </MenuListWrapperSecondary>
              </Stack>
            </FlexBox>
          </>
        )}
      </FlexBox>
    </Popover>
  );
};

const dataFilterMenuItemSx: SxProps = {
  maxWidth: '300px',
  borderRadius: 1,
  flex: 1,
  alignItems: 'flex-start',
  overflow: 'hidden'
};

const DataFilterRadio: FC<{ checked: boolean; saving?: boolean }> = ({
  checked,
  saving
}) => {
  return (
    <FlexBox ml={-1} mr={1}>
      {saving ? (
        <CircularProgress size={24} />
      ) : checked ? (
        <FlexBox display="flex" color="success.main" sx={{ opacity: 0.8 }}>
          <RadioButtonChecked />
        </FlexBox>
      ) : (
        <RadioButtonUnchecked />
      )}
    </FlexBox>
  );
};

const DataFilterMenuItem: typeof FlexBox = (props: FlexBoxProps) => {
  return (
    <FlexBox
      gap={1 / 2}
      mr={1}
      flex1
      col
      whiteSpace="pre-wrap"
      relative
      {...props}
    />
  );
};

const CustomLoadingButton = () => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        // TODO: Put this hex code in a variable
        backgroundColor: '#1c213c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <CircularProgress size={theme.spacing(2)} />
    </Box>
  );
};
