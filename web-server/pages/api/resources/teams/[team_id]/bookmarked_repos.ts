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

  res.send(await getBookmarkedRepos(req.payload.team_id));
});

export const getBookmarkedRepos = async (teamId?: ID) => {
  const query = db(Table.Bookmark).select('repo_id');

  if (!teamId)
    return (await query.then((res) =>
      res.map((item) => item?.repo_id)
    )) as ID[];

  const teamRepoIds = await getTeamRepos(teamId).then((res) =>
    res.map((repo) => repo.id)
  );

  return (await query
    .whereIn('repo_id', teamRepoIds)
    .then((res) => res.map((item) => item?.repo_id))) as ID[];
};

export default endpoint.serve();
