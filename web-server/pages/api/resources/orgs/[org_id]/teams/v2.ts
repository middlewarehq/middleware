import { groupBy, prop, uniq } from 'ramda';
import * as yup from 'yup';

import { getTeamRepos } from '@/api/resources/team_repos';
import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { Columns, Table } from '@/constants/db';
import { getTeamV2Mock } from '@/mocks/teams';
import { BaseTeam } from '@/types/api/teams';
import { db, getFirstRow } from '@/utils/db';

const getSchema = yup.object().shape({
  user_id: yup.string().uuid().nullable().optional(),
  include_teams: yup.array().of(yup.string().uuid()).nullable().optional()
});

const postSchema = yup.object().shape({
  repo_ids: yup.array().of(yup.string().uuid()).nullable().optional(),
  manager_id: yup.string().uuid().nullable().optional(),
  name: yup.string().required()
});

const patchSchema = yup.object().shape({
  id: yup.string().uuid().required(),
  name: yup.string().nullable().optional(),
  manager_id: yup.string().uuid().nullable().optional(),
  repo_ids: yup.array().of(yup.string().uuid()).nullable().optional()
});

const deleteSchema = yup.object().shape({
  id: yup.string().uuid().required()
});

const pathnameSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathnameSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock);
  }

  const { org_id } = req.payload;

  const getQuery = db('Team')
    .select('*')
    .where('org_id', org_id)
    .andWhereNot('is_deleted', true)
    .orderBy('name', 'asc');

  const teams = await getQuery;
  const repos = (
    await Promise.all(teams.map((team) => getTeamRepos(team.id)))
  ).flat();

  res.send({
    teams: teams,
    users: {},
    teamReposMap: groupBy(prop('team_id'), repos)
  });
});

endpoint.handle.POST(postSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock);
  }

  const { repo_ids = [], org_id, name } = req.payload;

  const team = await createTeam(org_id, name, []);
  const teamRepos = await addReposToTeam(team.id, repo_ids);

  res.send({ team, teamReposMap: groupBy(prop('team_id'), teamRepos) });
});

endpoint.handle.PATCH(patchSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock);
  }

  const { org_id, id, name, repo_ids } = req.payload;

  const upsertPayload: Record<string, any> = {
    id,
    org_id,
    updated_at: new Date(),
    manager_id: null
  };

  if (name) {
    upsertPayload.name = name;
  }

  const [team, teamRepos] = await Promise.all([
    updateTeam(id, name, []),
    addReposToTeam(id, repo_ids)
  ]);

  res.send({ team, teamReposMap: groupBy(prop('team_id'), teamRepos) });
});

endpoint.handle.DELETE(deleteSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock);
  }

  const data = await db('Team')
    .update('is_deleted', true)
    .where('id', req.payload.id)
    .orderBy('name', 'asc')
    .returning('*')
    .then(getFirstRow);

  res.send(data);
});

export default endpoint.serve();

const updateTeam = async (
  team_id: ID,
  team_name: string,
  member_ids: string[]
): Promise<BaseTeam> => {
  return handleRequest<BaseTeam>(`/team/${team_id}`, {
    method: 'PATCH',
    data: {
      name: team_name,
      member_ids: uniq(member_ids)
    }
  });
};

const createTeam = async (
  org_id: ID,
  team_name: string,
  member_ids: string[] = []
): Promise<BaseTeam> => {
  return handleRequest<BaseTeam>(`/org/${org_id}/team`, {
    method: 'POST',
    data: {
      name: team_name,
      member_ids: uniq(member_ids)
    }
  });
};

const addReposToTeam = async (team_id: ID, repo_ids: ID[]) => {
  try {
    await db(Table.TeamRepos)
      .update({
        [Columns[Table.TeamRepos].is_active]: false,
        updated_at: new Date()
      })
      .where('team_id', team_id);
  } catch (err) {}

  try {
    const payload = repo_ids.map((repo_id) => ({
      [Columns[Table.TeamRepos].team_id]: team_id,
      [Columns[Table.TeamRepos].org_repo_id]: repo_id,
      [Columns[Table.TeamRepos].is_active]: true
    }));
    const data =
      payload.length &&
      (await db('TeamRepos')
        .insert(
          repo_ids.map((repo_id) => ({
            [Columns[Table.TeamRepos].team_id]: team_id,
            [Columns[Table.TeamRepos].org_repo_id]: repo_id,
            [Columns[Table.TeamRepos].is_active]: true
          }))
        )
        .onConflict(['team_id', 'org_repo_id'])
        .merge()
        .returning('*'));
    return data;
  } catch (err) {}
};
