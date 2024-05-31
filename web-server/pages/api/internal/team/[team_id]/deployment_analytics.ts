import { isNil, reject } from 'ramda';
import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { updatePrFilterParams } from '@/api-helpers/team';
import { Row } from '@/constants/db';
import { mockDeploymentFreq } from '@/mocks/deployment-freq';
import {
  RepoWorkflowExtended,
  UpdatedTeamDeploymentsApiResponse,
  ActiveBranchMode
} from '@/types/resources';
import { adaptedDeploymentsMap } from '@/utils/adapt_deployments';
import { isoDateString } from '@/utils/date';
import { db } from '@/utils/db';
import {
  getBranchesAndRepoFilter,
  getWorkFlowFiltersAsPayloadForSingleTeam
} from '@/utils/filterUtils';
import groupBy from '@/utils/objectArray';

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  org_id: yup.string().uuid().required(),
  team_id: yup.string().uuid().required(),
  branch_mode: yup.string().oneOf(Object.values(ActiveBranchMode)).required(),
  branches: yup.string().optional().nullable(),
  from_date: yup.date().required(),
  to_date: yup.date().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) return res.send(mockDeploymentFreq);

  const { org_id, branch_mode, branches, team_id, from_date, to_date } =
    req.payload;

  const branchAndRepoFilters = await getBranchesAndRepoFilter({
    orgId: org_id,
    teamId: team_id,
    branchMode: branch_mode as ActiveBranchMode,
    branches
  });

  const [prFilters, workflowFilters] = await Promise.all([
    updatePrFilterParams(team_id, {}, branchAndRepoFilters).then(
      ({ pr_filter }) => ({
        pr_filter
      })
    ),
    getWorkFlowFiltersAsPayloadForSingleTeam({
      orgId: org_id,
      teamId: team_id
    })
  ]);
  const [updatedResponse, workflows_map] = await Promise.all([
    handleRequest<UpdatedTeamDeploymentsApiResponse>(
      `/teams/${team_id}/deployment_analytics`,
      {
        params: reject(isNil, {
          from_time: isoDateString(new Date(from_date)),
          to_time: isoDateString(new Date(to_date)),
          pr_filter: prFilters.pr_filter,
          workflow_filter: workflowFilters.workflow_filter
        })
      }
    ),
    db('RepoWorkflow')
      .select('*')
      .leftJoin(
        'TeamRepos',
        'TeamRepos.org_repo_id',
        'RepoWorkflow.org_repo_id'
      )
      .where('TeamRepos.team_id', team_id)
      .then((rows) =>
        groupBy(
          rows.map(
            (row: Row<'RepoWorkflow'>) =>
              ({
                id: row.id,
                created_at: row.created_at,
                name: row.name,
                provider: row.provider?.toLowerCase(),
                repo_id: row.org_repo_id,
                type: row.type,
                updated_at: row.updated_at
              }) as RepoWorkflowExtended
          )
        )
      )
    // handleRequest<{ workflows: RepoWorkflowExtended[] }>(
    //   `/teams/${team_id}/workflows`
    // ).then((r) =>
    //   r.workflows.reduce(
    //     (acc, w) => ({
    //       ...acc,
    //       [w.id]: w
    //     }),
    //     {} as Record<ID, RepoWorkflowExtended>
    //   )
    // )
  ]);

  const adaptedUpdatedResponse = {
    ...updatedResponse,
    deployments_map: adaptedDeploymentsMap(updatedResponse.deployments_map),
    workflows_map
  };

  res.send(adaptedUpdatedResponse);
});

export default endpoint.serve();
