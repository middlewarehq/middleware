import * as yup from 'yup';

import { Endpoint } from '@/api-helpers/global';
import { Row, Table } from '@/constants/db';
import { unassignedReposMock } from '@/mocks/repos';
import { getBaseRepoFromDBRepo } from '@/utils/code';
import { db } from '@/utils/db';
const getSchema = yup.object().shape({
  org_id: yup.string().uuid().required(),
  provider: yup.string().required()
});

const endpoint = new Endpoint();

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(unassignedReposMock.map(getBaseRepoFromDBRepo));
  }
  const { org_id, provider } = req.payload;

  const assignedReposQuery = db(Table.OrgRepo)
    .leftJoin(Table.TeamRepos, 'TeamRepos.org_repo_id', 'OrgRepo.id')
    .leftJoin(Table.Team, 'Team.id', 'TeamRepos.team_id')
    .select('OrgRepo.id')
    .distinct()
    .where({
      'TeamRepos.is_active': true,
      'Team.is_deleted': false,
      'OrgRepo.is_active': true
    })
    .andWhere({
      'OrgRepo.org_id': org_id,
      'OrgRepo.provider': provider
    }) as Promise<Pick<Row<'OrgRepo'>, 'id'>[]>;

  const [assignedRepos, allRepos] = await Promise.all([
    assignedReposQuery,
    await db(Table.OrgRepo).select('*').where({ org_id, provider })
  ]);

  const assignedReposSet = new Set(assignedRepos.map((repo) => repo.id));

  const unassignedRepos = allRepos.filter(
    (repo) => !assignedReposSet.has(repo.id)
  );

  res.send(unassignedRepos.map(getBaseRepoFromDBRepo));
});

export default endpoint.serve();
