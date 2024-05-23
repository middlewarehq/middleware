import * as yup from 'yup';

import { getTeamRepos } from '@/api/resources/team_repos';
import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Table } from '@/constants/db';
import { uuid } from '@/utils/datatype';
import { db } from '@/utils/db';

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send([uuid(), uuid()]);
  }

  res.send(await getUnsyncedRepos(req.payload.team_id));
});

export const getUnsyncedRepos = async (teamId: ID) => {
  const query = db(Table.Bookmark).select('repo_id');

  const teamRepoIds = await getTeamRepos(teamId).then((res) =>
    res.map((repo) => repo.id)
  );

  const syncedRepos = (await query
    .whereIn('repo_id', teamRepoIds)
    .then((res) => res.map((item) => item?.repo_id))) as ID[];

  const unsyncedRepos = teamRepoIds.filter(
    (repo) => !syncedRepos.includes(repo)
  );

  return unsyncedRepos;
};

export default endpoint.serve();
