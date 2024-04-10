import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Row } from '@/constants/db';
import { teamBaseReposMock } from '@/mocks/repos';
import { getBaseRepoFromDBRepo } from '@/utils/code';
import { db } from '@/utils/db';

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(teamBaseReposMock);
  }

  res.send(await getTeamBaseRepos(req.payload.team_id));
});

export const getTeamBaseRepos = (team_id: ID) =>
  (team_id
    ? db('TeamRepos')
        .select('*', 'OrgRepo.* as org_repo')
        .leftJoin('OrgRepo', 'OrgRepo.id', 'TeamRepos.org_repo_id')
        .where('TeamRepos.is_active', true)
        .andWhere('TeamRepos.team_id', team_id)
        .orderBy('name', 'asc')
        .then((row) => row.map(getBaseRepoFromDBRepo))
    : []) as any as Promise<(Row<'TeamRepos'> & Row<'OrgRepo'>)[]>;

export default endpoint.serve();
