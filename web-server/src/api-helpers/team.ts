import axios from 'axios';
import { equals, isNil, map, prop, reject, uniq } from 'ramda';

import {
  TeamSettings,
  TeamDataFilterDBRecord,
  RepoFilterConfig,
  TeamRepoBranchDetails
} from '@/types/resources';
import { db, dbRaw, getFirstRow } from '@/utils/db';
import { unid } from '@/utils/unistring';

export class TeamApi {
  private static url = '/api/resources/teams';
  static getRelationshipsForUser = async (userId: string) => {
    const response = await axios.get(TeamApi.url, {
      params: { user_id: userId }
    });
    return response.data;
  };
}

export const getTeamMembersFilterSettingForOrg = (orgId: ID) =>
  db('Team')
    .select('Team.id as team_id')
    .select(
      dbRaw.raw(
        '("Settings"."data" ->> \'should_apply_team_members_filter\')::BOOLEAN as member_filter_enabled'
      )
    )
    .leftJoin('Settings', 'Team.id', '=', 'Settings.entity_id')
    .where('Team.org_id', '=', orgId)
    .andWhere('Team.is_deleted', '=', false)
    .andWhere(
      'Settings.setting_type',
      '=',
      TeamSettings.TEAM_MEMBER_METRICS_FILTER_SETTING
    )
    .andWhere('Settings.is_deleted', '=', false) as Promise<
    TeamDataFilterDBRecord[]
  >;

export const getTeamMemberFilters = async (teamId: ID) => {
  const [isTeamMemberFilterEnabled, team] = await Promise.all([
    db('Settings')
      .select(
        dbRaw.raw(
          '("Settings"."data" ->> \'should_apply_team_members_filter\')::BOOLEAN as member_filter_enabled'
        )
      )
      .where('Settings.entity_id', '=', teamId)
      .andWhere(
        'Settings.setting_type',
        '=',
        TeamSettings.TEAM_MEMBER_METRICS_FILTER_SETTING
      )
      .then(getFirstRow)
      .then((row) => Boolean(row?.member_filter_enabled)) as Promise<boolean>,
    db('Team')
      .select(['member_ids', 'org_id'])
      .where('id', teamId)
      .then(getFirstRow) as Promise<{ member_ids: ID[]; org_id: ID }>
  ]);

  const { org_id, member_ids } = team;

  const tree = await db('OrgTree')
    .select('relations')
    .where('org_id', org_id)
    .then(getFirstRow)
    .then((row) => row.relations);

  const mgr = getManagerFromOrgTree(unid.t(teamId), tree);

  const all_team_members = [mgr, ...member_ids].filter(Boolean);

  const identities = await db('UserIdentity')
    .distinct('username')
    .where('user_id', 'IN', all_team_members)
    .then(map(prop('username')));

  return isTeamMemberFilterEnabled ? identities : null;
};

type UserRelationship = [ID, 'SOLID' | 'DOTTED'];

interface Hierarchy {
  [userId: string]: UserRelationship[];
}

function getManagerFromOrgTree(
  teamId: string,
  hierarchy: Hierarchy
): string | null {
  for (const userId in hierarchy) {
    const userRelationships = hierarchy[userId];
    for (const rel of userRelationships) {
      const [nodeId, type] = rel;
      if (type === 'DOTTED') continue;

      if (nodeId === teamId) {
        return unid.id(userId);
      }
    }
  }
  return null; // Team ID not found in the hierarchy
}

export const updatePrFilterParams = async <T extends {} = {}>(
  teamId: ID,
  params: T,
  filters?: Partial<{ branches: string; repo_filters: RepoFilterConfig }>
) => {
  const authors = await getTeamMemberFilters(teamId);

  const updatedParams = {
    authors,
    base_branches: filters?.branches?.split(','),
    repo_filters: filters?.repo_filters
  };
  const reducedParams = reject(isNil, updatedParams);
  const pr_filter = equals({}, reducedParams) ? null : reducedParams;

  return reject(isNil, {
    ...params,
    pr_filter
  }) as T & { pr_filter?: Partial<typeof updatedParams> };
};

export const getExcludedTicketTypesSetting = (teamOrUserId: ID) => {
  return db('Settings')
    .select(
      dbRaw.raw(
        '("Settings"."data" ->> \'excluded_ticket_types\')::json as excluded_ticket_types'
      )
    )
    .where('Settings.entity_id', '=', teamOrUserId)
    .andWhere(
      'Settings.setting_type',
      '=',
      TeamSettings.EXCLUDED_TICKET_TYPES_SETTING
    )
    .then(getFirstRow)
    .then((row) => row?.excluded_ticket_types || null) as Promise<
    string[] | null
  >;
};

export const updateTicketFilterParams = async <T extends {} = {}>(
  teamId: ID,
  params: T
) => {
  const [excluded_ticket_types, assignees] = await Promise.all([
    getExcludedTicketTypesSetting(teamId),
    getTeamMemberFilters(teamId)
  ]);

  const updatedParams = { excluded_ticket_types, assignees };
  const reducedParams = reject(isNil, updatedParams);
  const ticket_filter = equals({}, reducedParams) ? null : reducedParams;

  return reject(isNil, {
    ...params,
    ticket_filter
  }) as T & { ticket_filter?: Partial<typeof updatedParams> };
};

export const workFlowFiltersFromTeamProdBranches = <
  T extends Record<ID, TeamRepoBranchDetails[]>
>(
  teamProdBranchesMap: T
) => {
  return Object.keys(teamProdBranchesMap).reduce(
    (prev, currTeamId) => {
      const assignedReposProdBranches = uniq(
        teamProdBranchesMap[currTeamId].map((repo) => repo.prod_branches).flat()
      );

      return {
        ...prev,
        [currTeamId]: {
          workflow_filter: {
            head_branches: assignedReposProdBranches
          }
        }
      };
    },
    {} as Record<keyof T, { workflow_filter: { head_branches: string[] } }>
  );
};

export const repoFiltersFromTeamProdBranches = <
  T extends Record<ID, TeamRepoBranchDetails[]>
>(
  teamProdBranchesMap: T
) => {
  return Object.keys(teamProdBranchesMap).reduce(
    (prev, currTeamId) => {
      const assignedRepos = teamProdBranchesMap[currTeamId];
      const repoFilterForTeam = assignedRepos?.reduce(
        (prev, repo) => ({
          ...prev,
          [repo.org_repo_id]: {
            base_branches: repo.prod_branches?.filter(Boolean) ?? []
          }
        }),
        {} as RepoFilterConfig
      );

      return {
        ...prev,
        [currTeamId]: repoFilterForTeam ?? {}
      };
    },
    {} as Record<keyof T, RepoFilterConfig>
  );
};
