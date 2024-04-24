import axios from 'axios';
import { equals, isNil, reject, uniq } from 'ramda';

import {
  TeamSettings,
  TeamDataFilterDBRecord,
  RepoFilterConfig,
  TeamRepoBranchDetails
} from '@/types/resources';
import { db, dbRaw, getFirstRow } from '@/utils/db';

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

export const updatePrFilterParams = async <T extends {} = {}>(
  _teamId: ID,
  params: T,
  filters?: Partial<{ branches: string; repo_filters: RepoFilterConfig }>
) => {
  const updatedParams = {
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
  const excluded_ticket_types = await getExcludedTicketTypesSetting(teamId);

  const updatedParams = { excluded_ticket_types };
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
