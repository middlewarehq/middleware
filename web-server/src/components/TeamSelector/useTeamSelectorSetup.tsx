import { format } from 'date-fns';
import pluralize, { plural } from 'pluralize';
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
    integrations: { github: isGithubIntegrations }
  } = useAuth();
  const [showAllTeams, setShowAllTeams] = useState(true);
  const activeBranchMode = useSelector((state) => state.app.branchMode);
  const isAllBranchMode = activeBranchMode === ActiveBranchMode.ALL;
  const isSingleMode = mode === 'single' || mode === 'single-only';
  const teams = singleTeam;
  const hideDateSelector = mode === 'single-only' || mode === 'multiple-only';
  const hideTeamSelector = mode === 'date-only';
  const teamReposProdBranchMap = useSelector(
    (state) => state.app.teamsProdBranchMap
  );
  const loadingTeams = useSelector(
    (state) => state.team?.requests?.teams === FetchState.REQUEST
  );
  const fetchAllTeams = useCallback(() => {
    if (!orgId) return;
    dispatch(fetchTeams({ org_id: orgId, provider: Integration.GITHUB }));
  }, [dispatch, orgId]);

  const apiTeams = useSelector((state) => state.team.teams);

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
    if (isGithubIntegrations) fetchAllTeams();
  }, [fetchAllTeams, isGithubIntegrations, orgId]);

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
      teamsLabel
    ]
  );
};
