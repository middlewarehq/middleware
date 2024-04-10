import * as yup from 'yup';

import { getAllTeamsReposProdBranchesForOrgAsMap } from '@/api/internal/team/[team_id]/repo_branches';
import { Endpoint } from '@/api-helpers/global';
import {
  updatePrFilterParams,
  updateTicketFilterParams,
  workFlowFiltersFromTeamProdBranches,
  repoFiltersFromTeamProdBranches
} from '@/api-helpers/team';
import { CockpitBranchMode } from '@/types/resources';
import { getFilters } from '@/utils/cockpitMetricUtils';
import { isoDateString, getAggregateAndTrendsIntervalTime } from '@/utils/date';
const IdSchema = yup.string().uuid().required();

const pathSchema = yup.object().shape({
  org_id: IdSchema
});

const postSchema = yup.object().shape({
  team_ids: yup.array().of(IdSchema).required('Team IDs are required'),
  from_time: yup.date().required(),
  to_time: yup.date().required(),
  branch_mode: yup.string().oneOf(Object.values(CockpitBranchMode)).required()
});

const endpoint = new Endpoint(pathSchema);
export default endpoint.serve();

endpoint.handle.POST(postSchema, async (req, res) => {
  const { org_id, from_time, team_ids, to_time, branch_mode } = req.payload;
  const useProdBranches = branch_mode === CockpitBranchMode.PROD;
  const teamProdBranchesMap =
    await getAllTeamsReposProdBranchesForOrgAsMap(org_id);
  const teamRepoFiltersMap =
    repoFiltersFromTeamProdBranches(teamProdBranchesMap);

  const [prFilters, ticketFilters, workflowFilters] = await Promise.all([
    Promise.all(
      team_ids.map((teamId) =>
        updatePrFilterParams(
          teamId,
          {},
          {
            repo_filters: useProdBranches ? teamRepoFiltersMap[teamId] : null
          }
        ).then(({ pr_filter }) => ({
          pr_filter
        }))
      )
    ),
    Promise.all(
      team_ids.map((teamId) =>
        updateTicketFilterParams(teamId, {}).then(({ ticket_filter }) => ({
          ticket_filter
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
  } = getAggregateAndTrendsIntervalTime(from_time, to_time);

  const prDataObject = {
    from_time: isoDateString(currentCycleStartDay),
    to_time: isoDateString(currentCycleEndDay),
    teams_pr_filters: getFilters(prFilters, team_ids)
  };

  const ticketDataObject = {
    from_time: isoDateString(currentCycleStartDay),
    to_time: isoDateString(currentCycleEndDay),
    teams_ticket_filters: getFilters(ticketFilters, team_ids)
  };

  const workflowDataObject = {
    from_time: isoDateString(currentCycleStartDay),
    to_time: isoDateString(currentCycleEndDay),
    teams_workflow_filters: workflowFilters
  };

  return res.send({
    prDataObject,
    ticketDataObject,
    workflowDataObject,
    currTrendsTimeObject,
    prevTrendsTimeObject,
    prevCycleIntervalObject: {
      prevCycleStartDay: isoDateString(prevCycleStartDay),
      prevCycleEndDay: isoDateString(prevCycleEndDay)
    }
  });
});
