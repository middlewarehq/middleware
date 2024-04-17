import { AsyncThunk } from '@reduxjs/toolkit';
import { useCallback, useEffect, useMemo } from 'react';

import { FetchState } from '@/constants/ui-states';
import { useAuth } from '@/hooks/useAuth';
import {
  useSingleTeamConfig,
  useStateBranchConfig
} from '@/hooks/useStateTeamConfig';
import { useDispatch, useSelector } from '@/store';
import { IntegrationGroup } from '@/types/resources';

export const usePageData = (
  thunk: AsyncThunk<any, CollabTeamInsightsApiParams, {}>,
  pageKey: keyof State['requests'],
  paramOverrides?: Partial<
    CollabTeamInsightsApiParams & CollabRepoInsightsApiParams
  >
) => {
  const dispatch = useDispatch();
  const {
    dates,
    singleTeamId,
    partiallyUnselected,
    memberFilter,
    singleTeamProdBranchesConfig,
    ...props
  } = useSingleTeamConfig();
  const branches = useStateBranchConfig();
  const { integrationSet } = useAuth();
  const hasCodeProvider = integrationSet.has(IntegrationGroup.CODE);

  const refreshDataCallback = useCallback(() => {
    if (!singleTeamId || partiallyUnselected || !hasCodeProvider) return;
    dispatch(
      thunk({
        team_id: singleTeamId,
        from_date: dates.start,
        to_date: dates.end,
        branches,
        repo_filters: singleTeamProdBranchesConfig,
        ...(paramOverrides || {})
      })
    );
  }, [
    branches,
    dates.end,
    dates.start,
    dispatch,
    hasCodeProvider,
    paramOverrides,
    partiallyUnselected,
    singleTeamId,
    singleTeamProdBranchesConfig,
    thunk
  ]);

  useEffect(() => {
    refreshDataCallback();
  }, [
    branches,
    dates.end,
    dates.start,
    dispatch,
    partiallyUnselected,
    singleTeamId,
    thunk,
    paramOverrides,
    hasCodeProvider,
    memberFilter,
    singleTeamProdBranchesConfig,
    refreshDataCallback
  ]);

  const isLoading = useSelector(
    (state) =>
      state.doraMetrics?.requests[pageKey] === FetchState.DORMANT ||
      state.doraMetrics?.requests[pageKey] === FetchState.REQUEST
  );

  const isErrored = useSelector(
    (state) => state.doraMetrics.requests[pageKey] === FetchState.FAILURE
  );

  return useMemo(
    () => ({
      singleTeamId,
      dates,
      isLoading,
      isErrored,
      refreshDataCallback,
      ...props
    }),
    [dates, isErrored, isLoading, props, refreshDataCallback, singleTeamId]
  );
};
