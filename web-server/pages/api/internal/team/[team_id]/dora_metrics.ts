import { endOfDay, startOfDay } from 'date-fns';
import * as yup from 'yup';

import { Endpoint } from '@/api-helpers/global';
import {
  repoFiltersFromTeamProdBranches,
  updatePrFilterParams,
  workFlowFiltersFromTeamProdBranches
} from '@/api-helpers/team';
import { mockDoraMetrics } from '@/mocks/dora_metrics';
import { TeamDoraMetricsApiResponseType } from '@/types/resources';
import {
  fetchLeadTimeStats,
  fetchChangeFailureRateStats,
  fetchMeanTimeToRestoreStats,
  fetchDeploymentFrequencyStats
} from '@/utils/cockpitMetricUtils';
import { isoDateString, getAggregateAndTrendsIntervalTime } from '@/utils/date';

import { getAllTeamsReposProdBranchesForOrgAsMap } from './repo_branches';
import { getTeamPrs } from './insights';

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  org_id: yup.string().uuid().required(),
  branches: yup.string().optional().nullable(),
  from_date: yup.date().required(),
  to_date: yup.date().required(),
  repo_filters: yup.mixed().optional().nullable()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(mockDoraMetrics);
  }

  const {
    org_id,
    team_id: teamId,
    from_date: rawFromDate,
    to_date: rawToDate,
    branches,
    repo_filters
  } = req.payload;

  const teamProdBranchesMap =
    await getAllTeamsReposProdBranchesForOrgAsMap(org_id);
  const teamRepoFiltersMap =
    repoFiltersFromTeamProdBranches(teamProdBranchesMap);

  const from_date = startOfDay(new Date(rawFromDate));
  const to_date = endOfDay(new Date(rawToDate));

  const [prFilters, workflowFilters] = await Promise.all([
    updatePrFilterParams(
      teamId,
      {},
      {
        branches: branches,
        repo_filters: !branches ? teamRepoFiltersMap[teamId] : null
      }
    ).then(({ pr_filter }) => ({
      pr_filter
    })),
    Object.fromEntries(
      Object.entries(workFlowFiltersFromTeamProdBranches(teamProdBranchesMap))
    )[teamId]
  ]);

  const {
    currTrendsTimeObject,
    prevTrendsTimeObject,
    prevCycleStartDay,
    prevCycleEndDay,
    currentCycleStartDay,
    currentCycleEndDay
  } = getAggregateAndTrendsIntervalTime(from_date, to_date);

  const [
    leadTimeResponse,
    meanTimeToRestoreResponse,
    changeFailureRateResponse,
    deploymentFrequencyResponse
    summaryPrs
  ] = await Promise.all([
    fetchLeadTimeStats({
      teamId,
      currStatsTimeObject: {
        from_time: isoDateString(currentCycleStartDay),
        to_time: isoDateString(currentCycleEndDay)
      },
      prevStatsTimeObject: {
        from_time: isoDateString(prevCycleStartDay),
        to_time: isoDateString(prevCycleEndDay)
      },
      currTrendsTimeObject,
      prevTrendsTimeObject,
      prFilter: prFilters
    }),
    fetchMeanTimeToRestoreStats({
      teamId,
      currStatsTimeObject: {
        from_time: isoDateString(currentCycleStartDay),
        to_time: isoDateString(currentCycleEndDay)
      },
      prevStatsTimeObject: {
        from_time: isoDateString(prevCycleStartDay),
        to_time: isoDateString(prevCycleEndDay)
      },
      currTrendsTimeObject,
      prevTrendsTimeObject,
      prFilter: prFilters
    }),
    fetchChangeFailureRateStats({
      teamId,
      currStatsTimeObject: {
        from_time: isoDateString(currentCycleStartDay),
        to_time: isoDateString(currentCycleEndDay)
      },
      prevStatsTimeObject: {
        from_time: isoDateString(prevCycleStartDay),
        to_time: isoDateString(prevCycleEndDay)
      },
      currTrendsTimeObject,
      prevTrendsTimeObject,
      prFilter: prFilters,
      workflowFilter: workflowFilters
    }),
    fetchDeploymentFrequencyStats({
      teamId,
      currStatsTimeObject: {
        from_time: isoDateString(currentCycleStartDay),
        to_time: isoDateString(currentCycleEndDay)
      },
      prevStatsTimeObject: {
        from_time: isoDateString(prevCycleStartDay),
        to_time: isoDateString(prevCycleEndDay)
      },
      currTrendsTimeObject,
      prevTrendsTimeObject,
      workflowFilter: workflowFilters
    })
    getTeamPrs({
      team_id: teamId,
      branches,
      from_date: from_date,
      to_date: to_date,
      repo_filters
    }).then((r) => r.data)
  ]);

  console.log('🚀 ~ endpoint.handle.GET ~ leadTimeResponse:', leadTimeResponse);
  return res.send({
    lead_time_stats: leadTimeResponse.lead_time_stats,
    lead_time_trends: leadTimeResponse.lead_time_trends,
    mean_time_to_restore_stats:
      meanTimeToRestoreResponse.mean_time_to_restore_stats,
    mean_time_to_restore_trends:
      meanTimeToRestoreResponse.mean_time_to_restore_trends,
    change_failure_rate_stats:
      changeFailureRateResponse.change_failure_rate_stats,
    change_failure_rate_trends:
      changeFailureRateResponse.change_failure_rate_trends,
    deployment_frequency_stats:
      deploymentFrequencyResponse.deployment_frequency_stats,
    deployment_frequency_trends:
      deploymentFrequencyResponse.deployment_frequency_trends,
    summary_prs: summaryPrs,
    reverted_prs: []
  } as TeamDoraMetricsApiResponseType);
});

export default endpoint.serve();
