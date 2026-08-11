import { endOfDay, startOfDay } from 'date-fns';
import * as yup from 'yup';

import { getTeamRepos } from '@/api/resources/team_repos';
import { getUnsyncedRepos } from '@/api/resources/teams/[team_id]/unsynced_repos';
import { Endpoint } from '@/api-helpers/global';
import { updatePrFilterParams } from '@/api-helpers/team';
import { mockDoraMetrics } from '@/mocks/dora_metrics';
import {
  ActiveBranchMode,
  TeamDoraMetricsApiResponseType
} from '@/types/resources';
import {
  fetchLeadTimeStats,
  fetchChangeFailureRateStats,
  fetchMeanTimeToRestoreStats,
  fetchDeploymentFrequencyStats,
  // CLUSTOX: per-team DORA benchmarks.
  fetchTeamBenchmarks
} from '@/utils/cockpitMetricUtils';
// CLUSTOX: contributor filter.
import { stripContributorFilters } from '@/utils/contributorFilters';
import { isoDateString, getAggregateAndTrendsIntervalTime } from '@/utils/date';
import {
  getBranchesAndRepoFilter,
  getWorkFlowFiltersAsPayloadForSingleTeam
} from '@/utils/filterUtils';

import { getTeamLeadTimePRs } from './insights';

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  org_id: yup.string().uuid().required(),
  branches: yup.string().optional().nullable(),
  from_date: yup.date().required(),
  to_date: yup.date().required(),
  branch_mode: yup.string().oneOf(Object.values(ActiveBranchMode)).required(),
  // CLUSTOX: contributor filter -- git usernames, optional so an unfiltered
  // dashboard sends exactly what it always did.
  authors: yup.array().of(yup.string()).optional()
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
    branch_mode,
    // CLUSTOX: contributor filter.
    authors
  } = req.payload;

  const from_date = isoDateString(startOfDay(new Date(rawFromDate)));
  const to_date = isoDateString(endOfDay(new Date(rawToDate)));
  const [branchAndRepoFilters, unsyncedRepos, benchmarks] = await Promise.all([
    getBranchesAndRepoFilter({
      orgId: org_id,
      teamId,
      branchMode: branch_mode as ActiveBranchMode,
      branches
    }),
    getUnsyncedRepos(teamId),
    // CLUSTOX: per-team DORA benchmarks. Deliberately fetched here and sent
    // below, not on any other route: `metrics_summary` -- the only slice the
    // four cards read `benchmarks` from -- is written solely by whatever this
    // handler returns.
    //
    // The `catch` is load-bearing. Inside a Promise.all, a rejection here
    // would take down the entire DORA response and blank all four cards over
    // an optional decoration. That is not hypothetical: an unrelated 400 on a
    // sibling call in this same Promise.all rendered "something went wrong"
    // across the whole dashboard during the contributor-filter work. Targets
    // are already optional, and every card treats `undefined` as "no target",
    // so degrading to an unbenchmarked dashboard is the correct failure.
    fetchTeamBenchmarks(teamId).catch(() => undefined)
  ]);
  const [prFilters, workflowFilters] = await Promise.all([
    // CLUSTOX: contributor filter -- `authors` narrows Lead Time by PR author,
    // `eventActors` narrows Deployment Frequency by the actor who triggered the
    // run. Both are no-ops when the selection is empty.
    updatePrFilterParams(teamId, {}, { ...branchAndRepoFilters, authors }).then(
      ({ pr_filter }) => ({
        pr_filter
      })
    ),
    getWorkFlowFiltersAsPayloadForSingleTeam({
      orgId: org_id,
      teamId: teamId,
      eventActors: authors
    })
    // END CLUSTOX
  ]);

  // CLUSTOX: contributor filter -- Change Failure Rate and MTTR stay team-wide
  // (no defensible per-contributor definition until Jira incident ownership
  // lands), so they get a copy of the filters with the contributor keys
  // removed. With nothing selected these are identical to the originals, which
  // is what keeps unfiltered dashboards byte-for-byte unchanged.
  const {
    prFilter: prFilterWithoutAuthors,
    workflowFilter: workflowFilterWithoutEventActors
  } = stripContributorFilters(prFilters, workflowFilters);
  // END CLUSTOX

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
      prFilter: prFilterWithoutAuthors
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
      prFilter: prFilterWithoutAuthors,
      workflowFilter: workflowFilterWithoutEventActors
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
    // CLUSTOX: deliberately the *unfiltered* pr filter. This list lands in
    // redux as `summary_prs`, which has a second consumer: the Change Failure
    // Rate "See details" overlay (content/DoraMetrics/Incidents.tsx) uses it
    // as the denominator in `percent(revertedPrCount, prs.length)` against an
    // unfiltered revert count. Narrowing it to one contributor there reports
    // e.g. 12 reverts over 8 PRs = 150% on a card labelled team-wide.
    // TeamInsightsBody reads the same slice. One slice cannot be both
    // per-contributor and team-wide, so it stays team-wide; the lead time
    // *metric* above is still filtered.
    getTeamLeadTimePRs(teamId, from_date, to_date, prFilterWithoutAuthors).then(
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
    unsynced_repos: unsyncedRepos,
    // CLUSTOX: read by all four DORA cards as
    // `metrics_summary.benchmarks.<metric>.target` / `.source`.
    benchmarks
  } as TeamDoraMetricsApiResponseType);
});

export default endpoint.serve();
