import { ValueOf } from 'next/dist/shared/lib/constants';

import { handleRequest } from '@/api-helpers/axios';
import { workFlowFiltersFromTeamProdBranches } from '@/api-helpers/team';
import {
  IntervalTimeMap,
  MeanTimeToRestoreApiResponse,
  ChangeFailureRateApiResponse,
  ChangeFailureRateTrendsBaseStats,
  LeadTimeApiResponse,
  LeadTimeTrendsApiResponse,
  DeploymentFrequencyApiResponse,
  DeploymentFrequencyTrends,
  MeanTimeToRestoreApiTrendsResponse
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
    handleRequest<LeadTimeApiResponse>(`/team/${teamId}/lead_time`, {
      params: { ...currStatsTimeObject, ...prFilter }
    }),
    handleRequest<LeadTimeApiResponse>(`/team/${teamId}/lead_time`, {
      params: { ...prevStatsTimeObject, ...prFilter }
    }),
    handleRequest<LeadTimeTrendsApiResponse>(
      `/team/${teamId}/lead_time/trends`,
      {
        data: { ...currTrendsTimeObject, ...prFilter }
      }
    ),
    handleRequest<LeadTimeTrendsApiResponse>(
      `/team/${teamId}/lead_time/trends`,
      {
        data: {
          ...prFilter,
          ...prevTrendsTimeObject
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
      current: currIntervalLeadTimeTrends.lead_time_trends,
      previous: prevIntervalLeadTimeTrends.lead_time_trends
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
      `/team/${teamId}/mean_time_to_restore_service`,
      {
        params: { ...currStatsTimeObject }
      }
    ),
    handleRequest<MeanTimeToRestoreApiResponse>(
      `/team/${teamId}/mean_time_to_restore_service`,
      {
        params: {
          ...prevStatsTimeObject
        }
      }
    ),
    handleRequest<MeanTimeToRestoreApiTrendsResponse>(
      `/team/${teamId}/mean_time_to_restore_service/trends`,
      {
        params: { ...currTrendsTimeObject }
      }
    ).then((r) => r.mean_time_to_restore),
    handleRequest<MeanTimeToRestoreApiTrendsResponse>(
      `/team/${teamId}/mean_time_to_restore_service/trends`,
      {
        params: {
          ...prevTrendsTimeObject
        }
      }
    ).then((r) => r.mean_time_to_restore)
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
      `/team/${teamId}/change_failure_rate`,
      {
        params: {
          ...currStatsTimeObject,
          ...prFilter,
          ...workflowFilter
        }
      }
    ),
    handleRequest<ChangeFailureRateApiResponse>(
      `/team/${teamId}/change_failure_rate`,
      {
        params: {
          ...prevStatsTimeObject,
          ...prFilter,
          ...workflowFilter
        }
      }
    ),
    handleRequest<{
      change_failure_rate: Record<DateString, ChangeFailureRateTrendsBaseStats>;
    }>(`/team/${teamId}/change_failure_rate/trends`, {
      params: {
        ...currTrendsTimeObject,
        ...prFilter,
        ...workflowFilter
      }
    }).then((r) => r.change_failure_rate),
    handleRequest<{
      change_failure_rate: Record<DateString, ChangeFailureRateTrendsBaseStats>;
    }>(`/team/${teamId}/change_failure_rate/trends`, {
      params: {
        ...prevTrendsTimeObject,
        ...prFilter,
        ...workflowFilter
      }
    }).then((r) => r.change_failure_rate)
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
}) => {
  const {
    teamId,
    currStatsTimeObject,
    prevStatsTimeObject,
    currTrendsTimeObject,
    prevTrendsTimeObject,
    workflowFilter
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
        params: { ...workflowFilter, ...currStatsTimeObject }
      }
    ),
    handleRequest<DeploymentFrequencyApiResponse>(
      `/teams/${teamId}/deployment_frequency`,
      {
        params: {
          ...workflowFilter,
          ...prevStatsTimeObject
        }
      }
    ),
    handleRequest<DeploymentFrequencyTrends>(
      `/teams/${teamId}/deployment_frequency/trends`,
      {
        data: { ...workflowFilter, ...currTrendsTimeObject }
      }
    ).then((r) => r.deployment_frequency_trends),
    handleRequest<DeploymentFrequencyTrends>(
      `/teams/${teamId}/deployment_frequency/trends`,
      {
        data: {
          ...workflowFilter,
          ...prevTrendsTimeObject
        }
      }
    ).then((r) => r.deployment_frequency_trends)
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
