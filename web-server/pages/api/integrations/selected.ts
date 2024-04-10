import { groupBy, mapObjIndexed, prop } from 'ramda';
import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Table } from '@/constants/db';
import { Integration } from '@/constants/integrations';
import { selectedDBReposMock } from '@/mocks/github';
import {
  RepoWithMultipleWorkflows,
  RepoWithSingleWorkflow
} from '@/types/resources';
import { db, dbRaw } from '@/utils/db';

const getSchema = yup.object().shape({
  org_id: yup.string().uuid().required(),
  provider: yup.string().oneOf(Object.values(Integration))
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(selectedDBReposMock);
  }

  const { org_id, provider } = req.payload;

  res.send(await getSelectedReposForOrg(org_id, provider as Integration));
});

export const getSelectedReposForOrg = async (
  org_id: ID,
  provider: Integration
): Promise<RepoWithMultipleWorkflows[]> => {
  const dbRepos: RepoWithSingleWorkflow[] = await db(Table.OrgRepo)
    .leftJoin({ rw: Table.RepoWorkflow }, function () {
      this.on('OrgRepo.id', 'rw.org_repo_id').andOn(
        'rw.is_active',
        '=',
        dbRaw.raw(true)
      );
    })
    .select('OrgRepo.*')
    .select(dbRaw.raw('to_json(rw) as repo_workflow'))
    .from('OrgRepo')
    .where({ org_id, 'OrgRepo.provider': provider })
    .andWhereNot('OrgRepo.is_active', false);

  const reposGroupedById = mapObjIndexed((repos: RepoWithSingleWorkflow[]) => {
    return repos.reduce((map, repo) => {
      const updatedRepo = {
        ...repo,
        repo_workflows: [
          ...(map.repo_workflows || []),
          repo.repo_workflow
        ].filter(Boolean)
      };

      delete updatedRepo.repo_workflow;

      return updatedRepo;
    }, {} as RepoWithMultipleWorkflows);
  }, groupBy(prop('id'), dbRepos));

  return Object.values(reposGroupedById);
};

export default endpoint.serve();
