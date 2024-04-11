import { endOfDay, startOfDay } from 'date-fns';
import * as yup from 'yup';

import { fetchWorkflowConfiguredRepos } from '@/api/internal/team/[team_id]/deployment_freq';
import { Endpoint } from '@/api-helpers/global';
import {
  repoFiltersFromTeamProdBranches,
  updatePrFilterParams,
  workFlowFiltersFromTeamProdBranches
} from '@/api-helpers/team';
import { mockDoraMetrics } from '@/mocks/dora_metrics';
import { TeamDoraMetricsApiResponseType } from '@/types/resources';
import {
  getFilters,
  fetchLeadTimeStats,
  fetchChangeFailureRateStats,
  fetchMeanTimeToRestoreStats,
  fetchDeploymentFrequencyStats
} from '@/utils/cockpitMetricUtils';
import { isoDateString, getAggregateAndTrendsIntervalTime } from '@/utils/date';

import { getAllTeamsReposProdBranchesForOrgAsMap } from './repo_branches';

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});
const IdSchema = yup.string().uuid().required();
const getSchema = yup.object().shape({
  org_id: yup.string().uuid().required(),
  branches: yup.string().optional().nullable(),
  from_date: yup.date().required(),
  to_date: yup.date().required(),
  manager_teams_array: yup
    .array()
    .of(
      yup
        .object()
        .shape({
          manager_id: IdSchema.optional().nullable(),
          team_ids: yup.array().of(IdSchema).required('Team IDs are required')
        })
        .required()
    )
    .required('Manager Teams Array is required')
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(mockDoraMetrics);
  }

  const {
    org_id,
    team_id,
    from_date: rawFromDate,
    to_date: rawToDate,
    branches,
    manager_teams_array
  } = req.payload;

  const team_ids = manager_teams_array.map((m) => m.team_ids).flat();
  const teamProdBranchesMap =
    await getAllTeamsReposProdBranchesForOrgAsMap(org_id);
  const teamRepoFiltersMap =
    repoFiltersFromTeamProdBranches(teamProdBranchesMap);

  const from_date = startOfDay(new Date(rawFromDate));
  const to_date = endOfDay(new Date(rawToDate));

  const [prFilters, workflowFilters] = await Promise.all([
    Promise.all(
      team_ids.map((teamId) =>
        updatePrFilterParams(
          teamId,
          {},
          {
            branches: branches,
            repo_filters: !branches ? teamRepoFiltersMap[teamId] : null
          }
        ).then(({ pr_filter }) => ({
          pr_filter
        }))
      )
    ),
    Object.fromEntries(
      Object.entries(
        workFlowFiltersFromTeamProdBranches(teamProdBranchesMap)
      ).filter(([id]) => team_ids.includes(id))
    )
  ]);

  const {
    currTrendsTimeObject,
    prevTrendsTimeObject,
    prevCycleStartDay,
    prevCycleEndDay,
    currentCycleStartDay,
    currentCycleEndDay
  } = getAggregateAndTrendsIntervalTime(from_date, to_date);

  const prDataObject = {
    from_time: isoDateString(currentCycleStartDay),
    to_time: isoDateString(currentCycleEndDay),
    teams_pr_filters: getFilters(prFilters, team_ids),
    manager_teams_array
  };

  const workflowDataObject = {
    from_time: isoDateString(currentCycleStartDay),
    to_time: isoDateString(currentCycleEndDay),
    teams_workflow_filters: workflowFilters,
    manager_teams_array
  };

  const [
    leadTimeResponse,
    meanTimeToRestoreResponse,
    changeFailureRateResponse,
    deploymentFrequencyResponse,
    workflowConfiguredReposResponse
  ] = await Promise.all([
    fetchLeadTimeStats({
      org_id,
      prDataObject,
      currTrendsTimeObject,
      prevTrendsTimeObject
    }),
    fetchMeanTimeToRestoreStats({
      org_id,
      prDataObject,
      currTrendsTimeObject,
      prevTrendsTimeObject,
      prevCycleIntervalObject: {
        prevCycleStartDay,
        prevCycleEndDay
      }
    }),
    fetchChangeFailureRateStats({
      org_id,
      prDataObject,
      currTrendsTimeObject,
      prevTrendsTimeObject,
      prevCycleIntervalObject: {
        prevCycleStartDay,
        prevCycleEndDay
      }
    }),
    fetchDeploymentFrequencyStats({
      org_id,
      workflowDataObject,
      currTrendsTimeObject,
      prevTrendsTimeObject,
      prevCycleIntervalObject: {
        prevCycleStartDay,
        prevCycleEndDay
      }
    }),
    fetchWorkflowConfiguredRepos(team_id)
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
    allReposAssignedToTeam: workflowConfiguredReposResponse.all_team_repos,
    workflowConfiguredRepos: workflowConfiguredReposResponse.repos_included,
    deploymentsConfiguredForAllRepos:
      workflowConfiguredReposResponse.deployments_configured_for_all_repos,
    deploymentsConfigured:
      workflowConfiguredReposResponse.deployments_configured
  } as TeamDoraMetricsApiResponseType);
});

export default endpoint.serve();
