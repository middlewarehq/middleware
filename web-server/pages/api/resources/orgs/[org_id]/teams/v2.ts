import { groupBy, prop, uniq, mapObjIndexed, forEachObjIndexed } from 'ramda';
import * as yup from 'yup';

import { enableOrgReposIfNotEnabled } from '@/api/integrations/orgs';
import {
  CodeSourceProvidersIntegration,
  getProviderOrgs,
  getRepos
} from '@/api/internal/[org_id]/git_provider_org';
import { getTeamRepos } from '@/api/resources/team_repos';
import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { Columns, Table } from '@/constants/db';
import { Integration } from '@/constants/integrations';
import { getTeamV2Mock } from '@/mocks/teams';
import { BaseTeam } from '@/types/api/teams';
import { ReqOrgRepo } from '@/types/resources';
import { db, getFirstRow } from '@/utils/db';

const getSchema = yup.object().shape({
  provider: yup.string().oneOf(Object.values(Integration)).required()
});

const postSchema = yup.object().shape({
  name: yup.string().required(),
  provider: yup.string().oneOf(Object.values(Integration)).required(),
  org_repos: yup.lazy((obj) =>
    yup.object(
      mapObjIndexed(
        () =>
          yup.array().of(
            yup.object().shape({
              idempotency_key: yup.string().required(),
              slug: yup.string().required(),
              name: yup.string().required()
            })
          ),
        obj
      )
    )
  )
});

const patchSchema = yup.object().shape({
  id: yup.string().uuid().required(),
  name: yup.string().nullable().optional(),
  provider: yup.string().oneOf(Object.values(Integration)).required(),
  org_repos: yup.lazy((obj) =>
    yup.object(
      mapObjIndexed(
        () =>
          yup.array().of(
            yup.object().shape({
              idempotency_key: yup.string().required(),
              slug: yup.string().required(),
              name: yup.string().required()
            })
          ),
        obj
      )
    )
  )
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

  const { org_id, provider } = req.payload;
  const getQuery = db('Team')
    .select('*')
    .where('org_id', org_id)
    .andWhereNot('is_deleted', true)
    .orderBy('name', 'asc');

  const [teams, orgRepos] = await Promise.all([
    getQuery,
    getAllOrgRepos(org_id, provider as CodeSourceProvidersIntegration).then(
      (res) => res.flat()
    )
  ]);

  const repos = (
    await Promise.all(teams.map((team) => getTeamRepos(team.id)))
  ).flat();

  res.send({
    teams: teams,
    orgRepos: orgRepos,
    teamReposMap: groupBy(prop('team_id'), repos)
  });
});

endpoint.handle.POST(postSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock);
  }

  const { org_repos, org_id, provider, name } = req.payload;
  const orgReposList: ReqOrgRepo[] = [];
  forEachObjIndexed(
    (repos, org) => orgReposList.push({ org, repos }),
    org_repos
  );

  const [team, repos] = await Promise.all([
    createTeam(org_id, name, []),
    enableOrgReposIfNotEnabled(org_id, provider as Integration, orgReposList)
  ]);
  const teamRepos = await addReposToTeam(
    team.id,
    repos.map((r) => r.id)
  );

  res.send({ team, teamReposMap: groupBy(prop('team_id'), teamRepos), repos });
});

endpoint.handle.PATCH(patchSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock);
  }

  const { org_id, id, name, org_repos, provider } = req.payload;
  const orgReposList: ReqOrgRepo[] = [];
  forEachObjIndexed(
    (repos, org) => orgReposList.push({ org, repos }),
    org_repos
  );

  const upsertPayload: Record<string, any> = {
    id,
    org_id,
    updated_at: new Date(),
    manager_id: null
  };

  if (name) {
    upsertPayload.name = name;
  }

  const [team, repos] = await Promise.all([
    updateTeam(id, name, []),
    enableOrgReposIfNotEnabled(org_id, provider as Integration, orgReposList)
  ]);
  const teamRepos = await addReposToTeam(
    id,
    repos.map((r) => r.id)
  );

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

export const getAllOrgRepos = async (
  org_id: ID,
  provider: CodeSourceProvidersIntegration
) => {
  const providerOrgs = await getProviderOrgs(org_id, provider).then(
    (r) => r.data.orgs
  );
  const repos = await Promise.all(
    providerOrgs.map((org) => getRepos(org_id, provider, org.login))
  );
  return repos;
};
