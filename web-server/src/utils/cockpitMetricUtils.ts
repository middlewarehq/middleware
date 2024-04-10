import { omit } from 'ramda';

import { handleRequest } from '@/api-helpers/axios';
import { workFlowFiltersFromTeamProdBranches } from '@/api-helpers/team';
import {
  IntervalTimeMap,
  ManagerTeamsMap,
  UserAndTeamMapApiReturnType,
  CockpitLeadTimeApiResponse,
  LeadTimeTrends,
  MeanTimeToRestoreApiResponse,
  ChangeFailureRateApiResponse,
  DeploymentFrequencyTrendBase,
  ChangeFailureRateTrendsBaseStats,
  UpdatedDeploymentFrequencyAnalyticsResponseV2
} from '@/types/resources';
import { adaptDeploymentFrequencyAndGetBadge } from '@/utils/adapt_deployment_frequency';
import {
  LeadTimeDataV2,
  breakDownAdaptorForLeadTimeTrends,
  breakDownAdapterForLeadTimeResponse,
  managerAnalyticAdapter,
  teamAnalyticAdapter,
  leadTimeTrendArrayAdapter,
  adaptP90
} from '@/utils/lead_time_adaptor';

import { merge } from './datatype';
import { isoDateString } from './date';

export const getFilters = (filtersArray: any[], teamIds: ID[]) => {
  return teamIds.reduce((objectSoFar, currentTeamId, currentIndex) => {
    return {
      ...objectSoFar,
      [currentTeamId]: filtersArray[currentIndex]
    };
  }, {});
};

export const fetchLeadTimeV2 = async (params: {
  org_id: ID;
  currPrDataObject: IntervalTimeMap & {
    teams_pr_filters: ReturnType<typeof getFilters>;
    manager_teams_array: ManagerTeamsMap[];
  };
  prevPrDataObject: IntervalTimeMap & {
    teams_pr_filters: ReturnType<typeof getFilters>;
    manager_teams_array: ManagerTeamsMap[];
  };
  currTrendsTimeObject: IntervalTimeMap;
  prevTrendsTimeObject: IntervalTimeMap;
}) => {
  const {
    org_id,
    currPrDataObject: prDataObject,
    prevPrDataObject,
    currTrendsTimeObject,
    prevTrendsTimeObject
  } = params;

  const data: [
    LeadTimeDataV2['currLeadTimeResponse'],
    LeadTimeDataV2['prevLeadTimeResponse'],
    LeadTimeDataV2['currIntervalLeadTimeTrends'],
    LeadTimeDataV2['prevIntervalLeadTimeTrends'],
    CockpitLeadTimeApiResponse & UserAndTeamMapApiReturnType,
    LeadTimeDataV2['currLeadTimeResponse']
  ] = await Promise.all([
    handleRequest<LeadTimeDataV2['currLeadTimeResponse']>(
      `/fetch/orgs/${org_id}/cockpit/v2/lead_time`,
      {
        method: 'POST',
        data: prDataObject
      }
    ),
    handleRequest<LeadTimeDataV2['prevLeadTimeResponse']>(
      `/fetch/orgs/${org_id}/cockpit/v2/lead_time`,
      {
        method: 'POST',
        data: prevPrDataObject
      }
    ),
    handleRequest<LeadTimeDataV2['currIntervalLeadTimeTrends']>(
      `/fetch/orgs/${org_id}/cockpit/v2/lead_time/trends`,
      {
        method: 'POST',
        data: { ...prDataObject, ...currTrendsTimeObject }
      }
    ),
    handleRequest<LeadTimeDataV2['prevIntervalLeadTimeTrends']>(
      `/fetch/orgs/${org_id}/cockpit/v2/lead_time/trends`,
      {
        method: 'POST',
        data: {
          ...prDataObject,
          ...prevTrendsTimeObject
        }
      }
    ),
    handleRequest<CockpitLeadTimeApiResponse & UserAndTeamMapApiReturnType>(
      `/fetch/orgs/${org_id}/cockpit/lead_time`,
      {
        method: 'POST',
        data: prDataObject
      }
    ),
    handleRequest<any>(`/fetch/orgs/${org_id}/cockpit/lead_time/p90`, {
      method: 'POST',
      data: prDataObject
    })
  ]);

  const [
    currLeadTimeResponse,
    prevLeadTimeResponse,
    currLeadTimeTrends,
    prevLeadTimeTrends,
    { users_map, teams_map },
    leadTimeSummaryP90
  ] = data;

  const adaptedLeadTimeStats: Omit<
    CockpitLeadTimeApiResponse & UserAndTeamMapApiReturnType,
    'users_map' | 'teams_map'
  > = {
    breakdown: breakDownAdapterForLeadTimeResponse(
      currLeadTimeResponse,
      prevLeadTimeResponse
    ),
    current_average: currLeadTimeResponse.lead_time,
    previous_average: prevLeadTimeResponse.lead_time,
    manager_analytics: managerAnalyticAdapter(
      currLeadTimeResponse,
      prevLeadTimeResponse
    ),
    team_analytics: teamAnalyticAdapter(
      currLeadTimeResponse,
      prevLeadTimeResponse
    )
  };

  const currBreakDown = breakDownAdaptorForLeadTimeTrends(currLeadTimeTrends);

  const prevBreakDown = breakDownAdaptorForLeadTimeTrends(prevLeadTimeTrends);

  const currLeadTimeTrendArray = leadTimeTrendArrayAdapter(currLeadTimeTrends);

  const prevLeadTimeTrendArray = leadTimeTrendArrayAdapter(prevLeadTimeTrends);

  const currAdaptedLeadTimeTrend: LeadTimeTrends = {
    breakdown: currBreakDown,
    lead_time: currLeadTimeTrendArray
  };

  const prevAdaptedLeadTimeTrend: LeadTimeTrends = {
    breakdown: prevBreakDown,
    lead_time: prevLeadTimeTrendArray
  };

  const adaptedp90 = adaptP90(leadTimeSummaryP90);

  return {
    lead_time_stats: adaptedLeadTimeStats,
    lead_time_trends: {
      current: currAdaptedLeadTimeTrend,
      previous: prevAdaptedLeadTimeTrend
    },
    teams_map,
    users_map,
    data,
    lead_time_summary_p90: adaptedp90
  };
};

export const fetchLeadTimeStats = async (params: {
  org_id: ID;
  prDataObject: IntervalTimeMap & {
    teams_pr_filters: ReturnType<typeof getFilters>;
    manager_teams_array: ManagerTeamsMap[];
  };
  currTrendsTimeObject: IntervalTimeMap;
  prevTrendsTimeObject: IntervalTimeMap;
}) => {
  const { org_id, prDataObject, currTrendsTimeObject, prevTrendsTimeObject } =
    params;

  const data = await Promise.all([
    handleRequest<CockpitLeadTimeApiResponse & UserAndTeamMapApiReturnType>(
      `/fetch/orgs/${org_id}/cockpit/lead_time`,
      {
        method: 'POST',
        data: prDataObject
      }
    ),
    handleRequest<LeadTimeTrends>(
      `/fetch/orgs/${org_id}/cockpit/lead_time/trends`,
      {
        method: 'POST',
        data: { ...prDataObject, ...currTrendsTimeObject }
      }
    ),
    handleRequest<LeadTimeTrends>(
      `/fetch/orgs/${org_id}/cockpit/lead_time/trends`,
      {
        method: 'POST',
        data: {
          ...prDataObject,
          ...prevTrendsTimeObject
        }
      }
    )
  ]);

  const [
    leadTimeResponse,
    currIntervalLeadTimeTrends,
    prevIntervalLeadTimeTrends
  ] = data;

  const teams_map = leadTimeResponse.teams_map;
  const users_map = leadTimeResponse.users_map;

  return {
    data,
    teams_map,
    users_map,
    lead_time_stats: omit(['users_map', 'teams_map'], leadTimeResponse),
    lead_time_trends: {
      current: currIntervalLeadTimeTrends,
      previous: prevIntervalLeadTimeTrends
    }
  };
};

export const fetchMeanTimeToRestoreStats = async (params: {
  org_id: ID;
  prDataObject: IntervalTimeMap & {
    teams_pr_filters: ReturnType<typeof getFilters>;
    manager_teams_array: ManagerTeamsMap[];
  };
  currTrendsTimeObject: IntervalTimeMap;
  prevTrendsTimeObject: IntervalTimeMap;
  prevCycleIntervalObject: {
    prevCycleStartDay: Date;
    prevCycleEndDay: Date;
  };
}) => {
  const {
    org_id,
    prDataObject,
    currTrendsTimeObject,
    prevTrendsTimeObject,
    prevCycleIntervalObject
  } = params;
  const filteredDataObject = omit(['teams_pr_filters'], prDataObject);
  const [
    currMeanTimeToRestoreResponse,
    prevMeanTimeToRestoreResponse,
    currMeanTimeToRestoreTrends,
    prevMeanTimeToRestoreTrends
  ] = await Promise.all([
    handleRequest<MeanTimeToRestoreApiResponse>(
      `/fetch/orgs/${org_id}/cockpit/mean_time_to_restore_service`,
      {
        data: filteredDataObject,
        method: 'POST'
      }
    ),
    handleRequest<MeanTimeToRestoreApiResponse>(
      `/fetch/orgs/${org_id}/cockpit/mean_time_to_restore_service`,
      {
        data: {
          ...filteredDataObject,
          from_time: isoDateString(prevCycleIntervalObject.prevCycleStartDay),
          to_time: isoDateString(prevCycleIntervalObject.prevCycleEndDay)
        },
        method: 'POST'
      }
    ),
    handleRequest<{
      mean_time_to_restore: [DateString, number][];
    }>(`/fetch/orgs/${org_id}/cockpit/mean_time_to_restore_service/trends`, {
      data: { ...filteredDataObject, ...currTrendsTimeObject },
      method: 'POST'
    }).then((r) => r.mean_time_to_restore),
    handleRequest<{
      mean_time_to_restore: [DateString, number][];
    }>(`/fetch/orgs/${org_id}/cockpit/mean_time_to_restore_service/trends`, {
      data: {
        ...filteredDataObject,
        ...prevTrendsTimeObject
      },
      method: 'POST'
    }).then((r) => r.mean_time_to_restore)
  ]);
  const teams_map = currMeanTimeToRestoreResponse.teams_map;
  const users_map = currMeanTimeToRestoreResponse.users_map;

  return {
    teams_map,
    users_map,
    mean_time_to_restore_stats: {
      current: omit(['users_map', 'teams_map'], currMeanTimeToRestoreResponse),
      previous: omit(['users_map', 'teams_map'], prevMeanTimeToRestoreResponse)
    },
    mean_time_to_restore_trends: merge(
      Object.fromEntries(currMeanTimeToRestoreTrends),
      Object.fromEntries(prevMeanTimeToRestoreTrends)
    )
  };
};

export const fetchChangeFailureRateStats = async (params: {
  org_id: ID;
  prDataObject: IntervalTimeMap & {
    teams_pr_filters: ReturnType<typeof getFilters>;
    manager_teams_array: ManagerTeamsMap[];
  };
  currTrendsTimeObject: IntervalTimeMap;
  prevTrendsTimeObject: IntervalTimeMap;
  prevCycleIntervalObject: {
    prevCycleStartDay: Date;
    prevCycleEndDay: Date;
  };
}) => {
  const {
    org_id,
    prDataObject,
    currTrendsTimeObject,
    prevTrendsTimeObject,
    prevCycleIntervalObject
  } = params;
  const filteredDataObject = omit(['teams_pr_filters'], prDataObject);
  const [
    currChangeFailureRateResponse,
    prevChangeFailureRateResponse,
    currChangeFailureRateTrends,
    prevChangeFailureRateTrends
  ] = await Promise.all([
    handleRequest<ChangeFailureRateApiResponse>(
      `/fetch/orgs/${org_id}/cockpit/change_failure_rate`,
      {
        data: filteredDataObject,
        method: 'POST'
      }
    ),
    handleRequest<ChangeFailureRateApiResponse>(
      `/fetch/orgs/${org_id}/cockpit/change_failure_rate`,
      {
        data: {
          ...filteredDataObject,
          from_time: isoDateString(prevCycleIntervalObject.prevCycleStartDay),
          to_time: isoDateString(prevCycleIntervalObject.prevCycleEndDay)
        },
        method: 'POST'
      }
    ),
    handleRequest<{
      change_failure_rate: Record<DateString, ChangeFailureRateTrendsBaseStats>;
    }>(`/fetch/orgs/${org_id}/cockpit/change_failure_rate/trends`, {
      data: { ...filteredDataObject, ...currTrendsTimeObject },
      method: 'POST'
    }).then((r) => r.change_failure_rate),
    handleRequest<{
      change_failure_rate: Record<DateString, ChangeFailureRateTrendsBaseStats>;
    }>(`/fetch/orgs/${org_id}/cockpit/change_failure_rate/trends`, {
      data: {
        ...filteredDataObject,
        ...prevTrendsTimeObject
      },
      method: 'POST'
    }).then((r) => r.change_failure_rate)
  ]);
  const teams_map = currChangeFailureRateResponse.teams_map;
  const users_map = currChangeFailureRateResponse.users_map;

  return {
    teams_map,
    users_map,
    change_failure_rate_stats: {
      current: omit(['users_map', 'teams_map'], currChangeFailureRateResponse),
      previous: omit(['users_map', 'teams_map'], prevChangeFailureRateResponse)
    },
    change_failure_rate_trends: merge(
      currChangeFailureRateTrends,
      prevChangeFailureRateTrends
    )
  };
};

export const fetchDeploymentFrequencyStats = async (params: {
  org_id: ID;
  workflowDataObject: IntervalTimeMap & {
    teams_workflow_filters: ReturnType<
      typeof workFlowFiltersFromTeamProdBranches
    >;
    manager_teams_array: ManagerTeamsMap[];
  };
  currTrendsTimeObject: IntervalTimeMap;
  prevTrendsTimeObject: IntervalTimeMap;
  prevCycleIntervalObject: {
    prevCycleStartDay: Date;
    prevCycleEndDay: Date;
  };
}) => {
  const {
    org_id,
    workflowDataObject,
    currTrendsTimeObject,
    prevTrendsTimeObject,
    prevCycleIntervalObject
  } = params;

  const [
    currDeploymentFrequencyResponsev2,
    prevDeploymentFrequencyResponsev2,
    currDeploymentFrequencyTrendsv2,
    prevDeploymentFrequencyTrendsv2
  ] = await Promise.all([
    handleRequest<UpdatedDeploymentFrequencyAnalyticsResponseV2>(
      `/fetch/orgs/${org_id}/cockpit/v2/deployment_frequency`,
      {
        data: workflowDataObject,
        method: 'POST'
      }
    ),
    handleRequest<UpdatedDeploymentFrequencyAnalyticsResponseV2>(
      `/fetch/orgs/${org_id}/cockpit/v2/deployment_frequency`,
      {
        data: {
          ...workflowDataObject,
          from_time: isoDateString(prevCycleIntervalObject.prevCycleStartDay),
          to_time: isoDateString(prevCycleIntervalObject.prevCycleEndDay)
        },
        method: 'POST'
      }
    ),
    handleRequest<{
      deployment_frequency_trends: Record<
        DateString,
        DeploymentFrequencyTrendBase
      >;
    }>(`/fetch/orgs/${org_id}/cockpit/v2/deployment_frequency/trends`, {
      data: { ...workflowDataObject, ...currTrendsTimeObject },
      method: 'POST'
    }).then((r) => r.deployment_frequency_trends),
    handleRequest<{
      deployment_frequency_trends: Record<
        DateString,
        DeploymentFrequencyTrendBase
      >;
    }>(`/fetch/orgs/${org_id}/cockpit/v2/deployment_frequency/trends`, {
      data: {
        ...workflowDataObject,
        ...prevTrendsTimeObject
      },
      method: 'POST'
    }).then((r) => r.deployment_frequency_trends)
  ]);

  const teams_map = currDeploymentFrequencyResponsev2.teams_map;
  const users_map = currDeploymentFrequencyResponsev2.users_map;

  return {
    teams_map,
    users_map,
    deployment_frequency_stats: {
      current: omit(
        ['users_map', 'teams_map'],
        adaptDeploymentFrequencyAndGetBadge(currDeploymentFrequencyResponsev2)
      ),
      previous: omit(
        ['users_map', 'teams_map'],
        adaptDeploymentFrequencyAndGetBadge(prevDeploymentFrequencyResponsev2)
      )
    },
    deployment_frequency_trends: merge(
      currDeploymentFrequencyTrendsv2,
      prevDeploymentFrequencyTrendsv2
    )
  };
};
