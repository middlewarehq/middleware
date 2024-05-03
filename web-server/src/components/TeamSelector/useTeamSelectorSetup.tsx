import { format } from 'date-fns';
import pluralize, { plural } from 'pluralize';
import { prop } from 'ramda';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { Integration } from '@/constants/integrations';
import { FetchState } from '@/constants/ui-states';
import { useAuth } from '@/hooks/useAuth';
import { useStateTeamConfig } from '@/hooks/useStateTeamConfig';
import { appSlice } from '@/slices/app';
import { fetchTeams } from '@/slices/team';
import { useSelector } from '@/store';
import { ActiveBranchMode, TeamSelectorModes } from '@/types/resources';

type UseTeamSelectorSetupArgs = { mode: TeamSelectorModes };
/**
 * @internal **NEVER USE `useTeamSelectorSetup` DIRECTLY.
 * REFER TO `useSingleTeamConfig, useStateTeamConfig, useStateDateConfig`**
 * @deprecated It's not actually deprecated, but this should warn you before using it anywhere without confirmation
 */
export const useTeamSelectorSetup = ({ mode }: UseTeamSelectorSetupArgs) => {
  const dispatch = useDispatch();
  const { dateRange, singleTeam, setRange, partiallyUnselected } =
    useStateTeamConfig();
  const {
    orgId,
    integrations: { github: isGithubIntegrated }
  } = useAuth();
  const [showAllTeams, setShowAllTeams] = useState(true);
  const stateTeams = useSelector((state) => state.team.teams);
  const loadingTeams = useSelector(
    (state) => state.team.requests?.teams === FetchState.REQUEST
  );

  const activeBranchMode = useSelector((state) => state.app.branchMode);
  const isAllBranchMode = activeBranchMode === ActiveBranchMode.ALL;
  const isSingleMode = mode === 'single' || mode === 'single-only';
  const teams = singleTeam;
  const hideDateSelector = mode === 'single-only' || mode === 'multiple-only';
  const hideTeamSelector = mode === 'date-only';

  const teamIds = teams.map(prop('id')).join(',');
  const teamReposProdBranchMap = useSelector(
    (state) => state.app.teamsProdBranchMap
  );

  const setProdBranchNamesByTeamId = useCallback(
    (teamId: ID) => {
      const computedBranchNames =
        teamReposProdBranchMap?.[teamId]
          ?.map((r) => r.prod_branches)
          .filter(Boolean)
          .join(',') || '';
      dispatch(
        appSlice.actions.setBranchState({
          mode: isAllBranchMode ? ActiveBranchMode.ALL : ActiveBranchMode.PROD,
          names: computedBranchNames
        })
      );
    },
    [dispatch, isAllBranchMode, teamReposProdBranchMap]
  );

  useEffect(() => {
    if (!orgId) return;

    const params: any = {};
    const ids = teamIds.split(',').filter(Boolean);
    if (ids.length) params.include_teams = ids;

    if (isGithubIntegrated && !stateTeams.length)
      dispatch(fetchTeams({ org_id: orgId, provider: Integration.GITHUB }));
  }, [
    dispatch,
    isGithubIntegrated,
    orgId,
    showAllTeams,
    stateTeams.length,
    teamIds
  ]);

  const dateRangeLabel = !partiallyUnselected
    ? `${format(dateRange[0], 'do MMM')} to ${format(dateRange[1], 'do MMM')}`
    : 'Select Date Range';
  const teamsLabel = teams.length
    ? !isSingleMode
      ? `${teams.length} ${pluralize('team', teams.length)} selected`
      : `${teams[0]?.name} (${
          teamReposProdBranchMap[teams[0]?.id]?.length || 0
        } ${pluralize(
          'repo',
          teamReposProdBranchMap[teams[0]?.id]?.length || 0
        )})`
    : `Select ${!isSingleMode ? plural('Team') : 'Team'}`;

  return useMemo(
    () => ({
      teams,
      apiTeams: stateTeams,
      usersMap: {},
      dateRangeLabel,
      teamsLabel,
      hideDateSelector,
      hideTeamSelector,
      setRange,
      setShowAllTeams,
      loadingTeams,
      isSingleMode,
      showAllTeams,
      dateRange,
      setProdBranchNamesByTeamId
    }),
    [
      dateRange,
      dateRangeLabel,
      hideDateSelector,
      hideTeamSelector,
      isSingleMode,
      loadingTeams,
      setProdBranchNamesByTeamId,
      setRange,
      showAllTeams,
      stateTeams,
      teams,
      teamsLabel
    ]
  );
};
