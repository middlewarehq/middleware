import { AxiosResponse } from 'axios';
import { format } from 'date-fns';
import pluralize, { plural } from 'pluralize';
import { prop } from 'ramda';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { track } from '@/constants/events';
import { useAuth } from '@/hooks/useAuth';
import { useAxios } from '@/hooks/useAxios';
import { useStateTeamConfig } from '@/hooks/useStateTeamConfig';
import { appSlice } from '@/slices/app';
import { resourcesSlice } from '@/slices/resources';
import { teamSlice } from '@/slices/team';
import { useSelector } from '@/store';
import { Team } from '@/types/api/teams';
import {
  ActiveBranchMode,
  FetchTeamsResponse,
  TeamSelectorModes
} from '@/types/resources';

type UseTeamSelectorSetupArgs = { mode: TeamSelectorModes };
/**
 * @internal **NEVER USE `useTeamSelectorSetup` DIRECTLY.
 * REFER TO `useSingleTeamConfig, useStateTeamConfig, useStateDateConfig`**
 * @deprecated It's not actually deprecated, but this should warn you before using it anywhere without confirmation
 */
export const useTeamSelectorSetup = ({ mode }: UseTeamSelectorSetupArgs) => {
  const dispatch = useDispatch();
  const { dateRange, singleTeam, singleTeamId, setRange, partiallyUnselected } =
    useStateTeamConfig();
  const { orgId } = useAuth();
  const [showAllTeams, setShowAllTeams] = useState(true);
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
  const isAppSliceUpdated = useSelector((state) => state.app.isUpdated);

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

  const updateUsers = useCallback(
    (res: AxiosResponse<FetchTeamsResponse>) => {
      dispatch(teamSlice.actions.setTeams(res.data.teams));
      dispatch(
        appSlice.actions.setTeamProdBranchMap(res.data.teamReposProdBranchMap)
      );
      const teams = res.data.teams.filter((t) => t.id);

      const singleT = teams.find((team) => singleTeamId === team.id);
      const biggestT = biggestTeam(teams);
      const teamProdBranchNames =
        res.data.teamReposProdBranchMap?.[singleT?.id]
          ?.map((r) => r.prod_branches)
          .filter(Boolean)
          .join(',') || '';

      if (singleT) {
        dispatch(appSlice.actions.setSingleTeam([singleT]));
        if (!isAppSliceUpdated) {
          dispatch(
            appSlice.actions.setBranchState({
              mode: ActiveBranchMode.PROD,
              names: teamProdBranchNames
            })
          );
        }
      } else
        dispatch(appSlice.actions.setSingleTeam(biggestT ? [biggestT] : []));

      track('APP_TEAM_CHANGE_AUTO', { singleT });
    },
    [isAppSliceUpdated, dispatch, singleTeamId]
  );

  const [payload, { fetch: fetchTeams, loading: loadingTeams, fetch_state }] =
    useAxios<FetchTeamsResponse>(`/resources/orgs/${orgId}/teams`, {
      manual: true,
      onSuccess: updateUsers
    });

  useEffect(() => {
    dispatch(resourcesSlice.actions.updateFetchState({ users: fetch_state }));
  }, [dispatch, fetch_state]);

  const apiTeams = useMemo(
    () => payload?.teams || ([] as Team[]),
    [payload?.teams]
  );

  const usersMap = useMemo(
    () => payload?.users || ([] as unknown as FetchTeamsResponse['users']),
    [payload?.users]
  );

  useEffect(() => {
    if (!orgId) return;

    const params: any = {};
    const ids = teamIds.split(',').filter(Boolean);
    if (ids.length) params.include_teams = ids;

    fetchTeams({ params });
  }, [fetchTeams, orgId, showAllTeams, teamIds]);

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
      apiTeams,
      usersMap,
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
      apiTeams,
      dateRange,
      dateRangeLabel,
      hideDateSelector,
      hideTeamSelector,
      isSingleMode,
      loadingTeams,
      setProdBranchNamesByTeamId,
      setRange,
      showAllTeams,
      teams,
      teamsLabel,
      usersMap
    ]
  );
};

const biggestTeam = (argTeams: Team[]) => {
  if (!argTeams.length) return null;

  let teams = argTeams;

  let biggest = teams[0];

  teams.forEach((team) => {
    if (team.member_ids.length <= biggest.member_ids.length) return;
    biggest = team;
  });

  return biggest;
};
