import { groupBy, mapObjIndexed, prop, uniqBy } from 'ramda';
import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Table, Row } from '@/constants/db';
import { Integration } from '@/constants/integrations';
import { selectedDBReposMock } from '@/mocks/github';
import {
  RepoWithMultipleWorkflows,
  RepoWithSingleWorkflow
} from '@/types/resources';
import { db, dbRaw } from '@/utils/db';

const getSchema = yup.object().shape({
  org_id: yup.string().uuid().required(),
  providers: yup.array(yup.string().oneOf(Object.values(Integration)))
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(selectedDBReposMock);
  }

  const { org_id, providers } = req.payload;

  res.send(await getSelectedReposForOrg(org_id, providers as Integration[]));
});

export const getSelectedReposForOrg = async (
  org_id: ID,
  providers: Integration[]
): Promise<RepoWithMultipleWorkflows[]> => {
  const dbRepos: RepoWithSingleWorkflow[] = await db(Table.OrgRepo)
    .leftJoin({ rw: Table.RepoWorkflow }, function () {
      this.on('OrgRepo.id', 'rw.org_repo_id').andOn(
        'rw.is_active',
        '=',
        dbRaw.raw(true)
      );
    })
    .leftJoin({ tr: Table.TeamRepos }, function () {
      this.on('OrgRepo.id', 'tr.org_repo_id');
    })
    .select('OrgRepo.*')
    .select(dbRaw.raw('to_json(rw) as repo_workflow'))
    .select('tr.deployment_type', 'tr.team_id')
    .from('OrgRepo')
    .where('org_id', org_id)
    .and.whereIn('OrgRepo.provider', providers)
    .andWhereNot('OrgRepo.is_active', false);

  const repoToWorkflowMap = dbRepos.reduce(
    (map, repo) => {
      return {
        ...map,
        [repo.id]: uniqBy(
          prop('id'),
          [...(map[repo.id] || []), repo.repo_workflow].filter(Boolean)
        )
      };
    },
    {} as Record<ID, Row<'RepoWorkflow'>[]>
  );

  const reposGroupedById = mapObjIndexed(
    (repos: RepoWithSingleWorkflow[]) => {
      return repos.reduce((_, repo) => {
        const updatedRepo = {
          ...repo,
          repo_workflows: repoToWorkflowMap[repo.id]
            .map((workflow) => {
              return {
                name: workflow.name,
                value: workflow.provider_workflow_id
              };
            })
            .filter((workflow) => workflow.value)
        };
        delete updatedRepo.repo_workflow;

        return updatedRepo as any as RepoWithMultipleWorkflows;
      }, {} as RepoWithMultipleWorkflows);
    },
    groupBy(prop('id'), dbRepos)
  );
  return Object.values(reposGroupedById);
};

export default endpoint.serve();
