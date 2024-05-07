import { groupBy, prop } from 'ramda';
import * as yup from 'yup';

import { getAllOrgRepos } from '@/api/internal/[org_id]/git_provider_org';
import {
  getAllTeamsReposProdBranchesForOrg,
  transformTeamRepoBranchesToMap
} from '@/api/internal/team/[team_id]/repo_branches';
import { getTeamRepos } from '@/api/resources/team_repos';
import { Endpoint } from '@/api-helpers/global';
import { getTeamMembersFilterSettingForOrg } from '@/api-helpers/team';
import { Integration } from '@/constants/integrations';
import { getTeamV2Mock } from '@/mocks/teams';
import { FetchTeamsResponse } from '@/types/resources';
import { db } from '@/utils/db';
const getSchema = yup.object().shape({
  user_id: yup.string().uuid().nullable().optional(),
  include_teams: yup.array().of(yup.string().uuid()).nullable().optional()
});

const pathnameSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathnameSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(getTeamV2Mock);
  }

  const { include_teams, org_id, user_id } = req.payload;
  res.send(await getOrgTeams(org_id, user_id, include_teams));
});

export const getOrgTeams = async (
  org_id: ID,
  user_id?: ID,
  include_teams?: ID[]
): Promise<FetchTeamsResponse> => {
  const [teamRows, teamDataFilterSettings] = await Promise.all([
    db('Team')
      .select('*')
      .where('is_deleted', false)
      .andWhere('org_id', org_id)
      .orderBy('name', 'asc'),
    getTeamMembersFilterSettingForOrg(org_id)
  ]);

  const teamDataFilterMap = teamDataFilterSettings.reduce(
    (map, item) => ({
      ...map,
      [item.team_id]: Boolean(item?.member_filter_enabled)
    }),
    {} as Record<ID, boolean>
  );

  const [teamsReposProductionBranchDetails, repos, orgRepos] =
    await Promise.all([
      getAllTeamsReposProdBranchesForOrg(org_id),
      Promise.all(teamRows.map((team) => getTeamRepos(team.id))),
      getAllOrgRepos(org_id, Integration.GITHUB).then((res) => res.flat())
    ]);

  const teamManagers = {} as Record<ID, any>;

  let teams = teamRows.map((team) => ({
    ...team,
    manager_id: teamManagers[team.id]?.id,
    member_filter_enabled: Boolean(teamDataFilterMap[team.id])
  }));

  if (user_id)
    teams = teams.filter(
      (t) =>
        include_teams?.includes(t.id) ||
        t.manager_id === user_id ||
        t.member_ids.includes(user_id)
    );
  const teamReposProdBranchMap = transformTeamRepoBranchesToMap(
    teamsReposProductionBranchDetails
  );

  return {
    teams,
    orgRepos,
    teamReposProdBranchMap,
    teamReposMap: groupBy(prop('team_id'), repos.flat())
  };
};

export default endpoint.serve();
