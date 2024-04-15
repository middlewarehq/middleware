import { ValueOf } from 'next/dist/shared/lib/constants';

import { handleRequest } from '@/api-helpers/axios';
import { workFlowFiltersFromTeamProdBranches } from '@/api-helpers/team';
import {
  IntervalTimeMap,
  MeanTimeToRestoreApiResponse,
  ChangeFailureRateApiResponse,
  LeadTimeApiResponse,
  LeadTimeTrendsApiResponse,
  DeploymentFrequencyApiResponse,
  DeploymentFrequencyTrends,
  MeanTimeToRestoreApiTrendsResponse,
  ChangeFailureRateTrendsApiResponse
} from '@/types/resources';

export const getFilters = (filtersArray: any[], teamIds: ID[]) => {
  return teamIds.reduce((objectSoFar, currentTeamId, currentIndex) => {
    return {
      ...objectSoFar,
      [currentTeamId]: filtersArray[currentIndex]
    };
  }, {});
};

export const fetchLeadTimeStats = async (params: {
  teamId: ID;
  currStatsTimeObject: IntervalTimeMap;
  prevStatsTimeObject: IntervalTimeMap;
  prFilter: ReturnType<typeof getFilters>;
  currTrendsTimeObject: IntervalTimeMap;
  prevTrendsTimeObject: IntervalTimeMap;
}) => {
  const {
    teamId,
    currStatsTimeObject,
    prevStatsTimeObject,
    prFilter,
    currTrendsTimeObject,
    prevTrendsTimeObject
  } = params;

  const data = await Promise.all([
    handleRequest<LeadTimeApiResponse>(`/teams/${teamId}/lead_time`, {
      params: { ...currStatsTimeObject, ...prFilter }
    }),
    handleRequest<LeadTimeApiResponse>(`/teams/${teamId}/lead_time`, {
      params: { ...prevStatsTimeObject, ...prFilter }
    }),
    handleRequest<LeadTimeTrendsApiResponse>(
      `/teams/${teamId}/lead_time/trends`,
      {
        params: { ...currTrendsTimeObject, ...prFilter }
      }
    ),
    handleRequest<LeadTimeTrendsApiResponse>(
      `/teams/${teamId}/lead_time/trends`,
      {
        params: {
          ...prevTrendsTimeObject,
          ...prFilter
        }
      }
    )
  ]);

  const [
    currLeadTimeResponse,
    prevLeadTimeResponse,
    currIntervalLeadTimeTrends,
    prevIntervalLeadTimeTrends
  ] = data;

  return {
    lead_time_stats: {
      current: currLeadTimeResponse,
      previous: prevLeadTimeResponse
    },
    lead_time_trends: {
      current: currIntervalLeadTimeTrends,
      previous: prevIntervalLeadTimeTrends
    }
  };
};

export const fetchMeanTimeToRestoreStats = async (params: {
  teamId: ID;
  currStatsTimeObject: IntervalTimeMap;
  prevStatsTimeObject: IntervalTimeMap;
  prFilter: ReturnType<typeof getFilters>;
  currTrendsTimeObject: IntervalTimeMap;
  prevTrendsTimeObject: IntervalTimeMap;
}) => {
  const {
    teamId,
    currTrendsTimeObject,
    prevTrendsTimeObject,
    currStatsTimeObject,
    prevStatsTimeObject
  } = params;

  const [
    currMeanTimeToRestoreResponse,
    prevMeanTimeToRestoreResponse,
    currMeanTimeToRestoreTrends,
    prevMeanTimeToRestoreTrends
  ] = await Promise.all([
    handleRequest<MeanTimeToRestoreApiResponse>(
      `/teams/${teamId}/mean_time_to_recovery`,
      {
        params: { ...currStatsTimeObject }
      }
    ),
    handleRequest<MeanTimeToRestoreApiResponse>(
      `/teams/${teamId}/mean_time_to_recovery`,
      {
        params: {
          ...prevStatsTimeObject
        }
      }
    ),
    handleRequest<MeanTimeToRestoreApiTrendsResponse>(
      `/teams/${teamId}/mean_time_to_recovery/trends`,
      {
        params: { ...currTrendsTimeObject }
      }
    ),
    handleRequest<MeanTimeToRestoreApiTrendsResponse>(
      `/teams/${teamId}/mean_time_to_recovery/trends`,
      {
        params: {
          ...prevTrendsTimeObject
        }
      }
    )
  ]);

  return {
    mean_time_to_restore_stats: {
      current: currMeanTimeToRestoreResponse,
      previous: prevMeanTimeToRestoreResponse
    },
    mean_time_to_restore_trends: {
      current: currMeanTimeToRestoreTrends,
      previous: prevMeanTimeToRestoreTrends
    }
  };
};

export const fetchChangeFailureRateStats = async (params: {
  teamId: ID;
  currStatsTimeObject: IntervalTimeMap;
  prevStatsTimeObject: IntervalTimeMap;
  prFilter: ReturnType<typeof getFilters>;
  currTrendsTimeObject: IntervalTimeMap;
  prevTrendsTimeObject: IntervalTimeMap;
  workflowFilter: ValueOf<
    ReturnType<typeof workFlowFiltersFromTeamProdBranches>
  >;
}) => {
  const {
    teamId,
    currStatsTimeObject,
    prevStatsTimeObject,
    prFilter,
    workflowFilter,
    currTrendsTimeObject,
    prevTrendsTimeObject
  } = params;

  const [
    currChangeFailureRateResponse,
    prevChangeFailureRateResponse,
    currChangeFailureRateTrends,
    prevChangeFailureRateTrends
  ] = await Promise.all([
    handleRequest<ChangeFailureRateApiResponse>(
      `/teams/${teamId}/change_failure_rate`,
      {
        params: {
          ...currStatsTimeObject,
          ...prFilter,
          ...workflowFilter
        }
      }
    ),
    handleRequest<ChangeFailureRateApiResponse>(
      `/teams/${teamId}/change_failure_rate`,
      {
        params: {
          ...prevStatsTimeObject,
          ...prFilter,
          ...workflowFilter
        }
      }
    ),
    handleRequest<ChangeFailureRateTrendsApiResponse>(
      `/teams/${teamId}/change_failure_rate/trends`,
      {
        params: {
          ...currTrendsTimeObject,
          ...prFilter,
          ...workflowFilter
        }
      }
    ),
    handleRequest<ChangeFailureRateTrendsApiResponse>(
      `/teams/${teamId}/change_failure_rate/trends`,
      {
        params: {
          ...prevTrendsTimeObject,
          ...prFilter,
          ...workflowFilter
        }
      }
    )
  ]);

  return {
    change_failure_rate_stats: {
      current: currChangeFailureRateResponse,
      previous: prevChangeFailureRateResponse
    },
    change_failure_rate_trends: {
      current: currChangeFailureRateTrends,
      previous: prevChangeFailureRateTrends
    }
  };
};

export const fetchDeploymentFrequencyStats = async (params: {
  teamId: ID;
  workflowFilter: ValueOf<
    ReturnType<typeof workFlowFiltersFromTeamProdBranches>
  >;
  currStatsTimeObject: IntervalTimeMap;
  prevStatsTimeObject: IntervalTimeMap;
  currTrendsTimeObject: IntervalTimeMap;
  prevTrendsTimeObject: IntervalTimeMap;
  prFilter: ReturnType<typeof getFilters>;
}) => {
  const {
    teamId,
    currStatsTimeObject,
    prevStatsTimeObject,
    currTrendsTimeObject,
    prevTrendsTimeObject,
    workflowFilter,
    prFilter
  } = params;

  const [
    currDeploymentFrequencyResponse,
    prevDeploymentFrequencyResponse,
    currDeploymentFrequencyTrends,
    prevDeploymentFrequencyTrends
  ] = await Promise.all([
    handleRequest<DeploymentFrequencyApiResponse>(
      `/teams/${teamId}/deployment_frequency`,
      {
        params: { ...prFilter, ...workflowFilter, ...currStatsTimeObject }
      }
    ),
    handleRequest<DeploymentFrequencyApiResponse>(
      `/teams/${teamId}/deployment_frequency`,
      {
        params: {
          ...workflowFilter,
          ...prFilter,
          ...prevStatsTimeObject
        }
      }
    ),
    handleRequest<DeploymentFrequencyTrends>(
      `/teams/${teamId}/deployment_frequency/trends`,
      {
        params: { ...workflowFilter, ...prFilter, ...currTrendsTimeObject }
      }
    ),
    handleRequest<DeploymentFrequencyTrends>(
      `/teams/${teamId}/deployment_frequency/trends`,
      {
        params: {
          ...workflowFilter,
          ...prFilter,
          ...prevTrendsTimeObject
        }
      }
    )
  ]);

  return {
    deployment_frequency_stats: {
      current: currDeploymentFrequencyResponse,
      previous: prevDeploymentFrequencyResponse
    },
    deployment_frequency_trends: {
      current: currDeploymentFrequencyTrends,
      previous: prevDeploymentFrequencyTrends
    }
  };
};
