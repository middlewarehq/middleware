import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Columns, Row, Table } from '@/constants/db';
import { teamReposMock } from '@/mocks/repos';
import { TeamRepoBranchDetails } from '@/types/resources';
import { db } from '@/utils/db';

const getSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const patchSchema = yup.object().shape({
  team_id: yup.string().uuid().required(),
  repo_ids: yup.array().of(yup.string().uuid()).required()
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(teamReposMock);
  }

  res.send(await getTeamRepos(req.payload.team_id));
});

export const getTeamRepos = (team_id: ID) =>
  (team_id
    ? db('TeamRepos')
        .select('*', 'OrgRepo.* as org_repo')
        .leftJoin('OrgRepo', 'OrgRepo.id', 'TeamRepos.org_repo_id')
        .where('TeamRepos.is_active', true)
        .andWhere('TeamRepos.team_id', team_id)
        .orderBy('name', 'asc')
    : []) as any as Promise<(Row<'TeamRepos'> & Row<'OrgRepo'>)[]>;

endpoint.handle.PATCH(patchSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(teamReposMock);
  }

  try {
    await db(Table.TeamRepos)
      .update({
        [Columns[Table.TeamRepos].is_active]: false,
        updated_at: new Date()
      })
      .where('team_id', req.payload.team_id);
  } catch (err) {
    // DO NOTHING. Empty update throws.
  }

  try {
    const payload = req.payload.repo_ids.map((repo_id) => ({
      [Columns[Table.TeamRepos].team_id]: req.payload.team_id,
      [Columns[Table.TeamRepos].org_repo_id]: repo_id,
      [Columns[Table.TeamRepos].is_active]: true
    }));
    payload.length &&
      (await db('TeamRepos')
        .insert(
          req.payload.repo_ids.map((repo_id) => ({
            [Columns[Table.TeamRepos].team_id]: req.payload.team_id,
            [Columns[Table.TeamRepos].org_repo_id]: repo_id,
            [Columns[Table.TeamRepos].is_active]: true
          }))
        )
        .onConflict(['team_id', 'org_repo_id'])
        .merge());
  } catch (err) {
    // DO NOTHING. Empty update throws.
  }
  handleRequest<Omit<TeamRepoBranchDetails, 'name'>[]>(
    `/teams/${req.payload.team_id}/cache_prod_branch`,
    { method: 'PUT' }
  );
  res.status(200).send({});
});

export default endpoint.serve();
