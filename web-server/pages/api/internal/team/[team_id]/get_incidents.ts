import { endOfDay, startOfDay } from 'date-fns';
import { isNil, reject } from 'ramda';
import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { updatePrFilterParams } from '@/api-helpers/team';
import { mockDeploymentsWithIncidents } from '@/mocks/incidents';
import {
  DeploymentWithIncidents,
  IncidentApiResponseType,
  ActiveBranchMode
} from '@/types/resources';
import { getWeekStartAndEndInterval } from '@/utils/date';
import { getBranchesAndRepoFilter } from '@/utils/filterUtils';

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  from_date: yup.date().required(),
  to_date: yup.date().required(),
  branches: yup.string().optional().nullable(),
  repo_filters: yup.mixed().optional().nullable(),
  org_id: yup.string().uuid().required(),
  branch_mode: yup.string().oneOf(Object.values(ActiveBranchMode)).required()
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
    org_id,
    branch_mode
  } = req.payload;
  const from_date = startOfDay(new Date(rawFromDate));
  const to_date = endOfDay(new Date(rawToDate));

  const branchAndRepoFilters = await getBranchesAndRepoFilter({
    orgId: org_id,
    teamId: team_id,
    branchMode: branch_mode as ActiveBranchMode,
    branches
  });
  const prFilter = await updatePrFilterParams(
    team_id,
    {},
    branchAndRepoFilters
  ).then(({ pr_filter }) => ({
    pr_filter
  }));

  const deploymentsWithIncident = await getTeamIncidentsWithDeployment({
    team_id,
    from_date,
    to_date,
    pr_filter: prFilter.pr_filter
  });

  return res.send({
    deployments_with_incidents: deploymentsWithIncident,
    summary_prs: [],
    revert_prs: []
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
