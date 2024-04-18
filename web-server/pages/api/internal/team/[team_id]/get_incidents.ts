import { endOfDay, startOfDay } from 'date-fns';
import { isNil, reject } from 'ramda';
import * as yup from 'yup';

import { getTeamPrs } from '@/api/internal/team/[team_id]/insights';
import { getAllTeamsReposProdBranchesForOrgAsMap } from '@/api/internal/team/[team_id]/repo_branches';
import { getTeamRevertedPrs } from '@/api/internal/team/[team_id]/revert_prs';
import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import {
  updatePrFilterParams,
  repoFiltersFromTeamProdBranches
} from '@/api-helpers/team';
import { mockDeploymentsWithIncidents } from '@/mocks/incidents';
import {
  DeploymentWithIncidents,
  IncidentApiResponseType
} from '@/types/resources';
import { getWeekStartAndEndInterval, isoDateString } from '@/utils/date';

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  from_date: yup.date().required(),
  to_date: yup.date().required(),
  branches: yup.string().optional().nullable(),
  repo_filters: yup.mixed().optional().nullable(),
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data)
    return res.send(mockDeploymentsWithIncidents);

  const {
    team_id,
    from_date: rawFromDate,
    to_date: rawToDate,
    branches,
    repo_filters,
    org_id
  } = req.payload;
  const from_date = startOfDay(new Date(rawFromDate));
  const to_date = endOfDay(new Date(rawToDate));

  const params = await updatePrFilterParams(
    team_id,
    {
      from_time: isoDateString(new Date(from_date)),
      to_time: isoDateString(new Date(to_date))
    },
    { branches, repo_filters }
  );

  const teamProdBranchesMap =
    await getAllTeamsReposProdBranchesForOrgAsMap(org_id);
  const teamRepoFiltersMap =
    repoFiltersFromTeamProdBranches(teamProdBranchesMap);
  const pr_filter = await updatePrFilterParams(
    team_id,
    {},
    {
      branches: branches,
      repo_filters: !branches ? teamRepoFiltersMap[team_id] : null
    }
  ).then(({ pr_filter }) => ({
    pr_filter
  }));

  const [deploymentsWithIncident, summaryPrs, revertedPrs] = await Promise.all([
    getTeamIncidentsWithDeployment({ team_id, from_date, to_date, pr_filter }),
    getTeamPrs({
      team_id,
      branches,
      from_date: from_date,
      to_date: to_date,
      repo_filters
    })
      .then((r) => r.data)
      .catch(() => {
        // TODO: remove mocks from here
        return mockDeploymentsWithIncidents.summary_prs;
      }),
    getTeamRevertedPrs({ ...params, team_id }).catch(() => {
      // TODO: remove mocks from here
      return mockDeploymentsWithIncidents.revert_prs;
    })
  ]);

  return res.send({
    deployments_with_incidents: deploymentsWithIncident,
    summary_prs: summaryPrs,
    revert_prs: revertedPrs
  } as IncidentApiResponseType);
});

export const getTeamIncidentsWithDeployment = async (params: {
  team_id: ID;
  from_date: DateString | Date;
  to_date: DateString | Date;
  pr_filter: any;
}) => {
  const [from_time, to_time] = getWeekStartAndEndInterval(
    params.from_date,
    params.to_date
  );

  return handleRequest<DeploymentWithIncidents[]>(
    `/teams/${params.team_id}/deployments_with_related_incidents`,
    {
      params: reject(isNil, {
        from_time,
        to_time,
        pr_filter: params.pr_filter
      })
    }
  );
};

export default endpoint.serve();
