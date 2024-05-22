import { endOfDay, startOfDay } from 'date-fns';
import * as yup from 'yup';

import { getTeamRepos } from '@/api/resources/team_repos';
import { Endpoint } from '@/api-helpers/global';
import {
  repoFiltersFromTeamProdBranches,
  updatePrFilterParams,
  workFlowFiltersFromTeamProdBranches
} from '@/api-helpers/team';
import { Table } from '@/constants/db';
import { mockDoraMetrics } from '@/mocks/dora_metrics';
import { TeamDoraMetricsApiResponseType } from '@/types/resources';
import {
  fetchLeadTimeStats,
  fetchChangeFailureRateStats,
  fetchMeanTimeToRestoreStats,
  fetchDeploymentFrequencyStats
} from '@/utils/cockpitMetricUtils';
import { isoDateString, getAggregateAndTrendsIntervalTime } from '@/utils/date';
import { db } from '@/utils/db';

import { getTeamLeadTimePRs } from './insights';
import { getAllTeamsReposProdBranchesForOrgAsMap } from './repo_branches';

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
    branches
  } = req.payload;

  const [teamProdBranchesMap, bookmarkedRepos] = await Promise.all([
    getAllTeamsReposProdBranchesForOrgAsMap(org_id),
    getBookmarkedRepos()
  ]);
  const teamRepoFiltersMap =
    repoFiltersFromTeamProdBranches(teamProdBranchesMap);

  const from_date = isoDateString(startOfDay(new Date(rawFromDate)));
  const to_date = isoDateString(endOfDay(new Date(rawToDate)));

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
    deploymentFrequencyResponse,
    leadtimePrs,
    teamRepos
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
      workflowFilter: workflowFilters,
      prFilter: prFilters
    }),
    getTeamLeadTimePRs(teamId, from_date, to_date, prFilters).then(
      (r) => r.data
    ),
    getTeamRepos(teamId)
  ]);

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
    lead_time_prs: leadtimePrs,
    assigned_repos: teamRepos,
    bookmarked_repos: bookmarkedRepos
  } as TeamDoraMetricsApiResponseType & any);
});

export default endpoint.serve();

export const getBookmarkedRepos = async () => {
  return await db(Table.Bookmark).select('*');
};
