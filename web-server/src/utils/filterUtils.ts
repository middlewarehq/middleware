import { getAllTeamsReposProdBranchesForOrgAsMap } from '@/api/internal/team/[team_id]/repo_branches';
import {
  repoFiltersFromTeamProdBranches,
  updatePrFilterParams,
  workFlowFiltersFromTeamProdBranches
} from '@/api-helpers/team';
import { ActiveBranchMode, TeamRepoBranchDetails } from '@/types/resources';

export const getBranchesAndRepoFilter = async (params: {
  orgId: ID;
  teamId: ID;
  branches?: string;
  branchMode: ActiveBranchMode;
  ignoreBranches?: boolean;
}) => {
  const { orgId, teamId, branchMode, ignoreBranches, branches } = params;
  const useProdBranches = branchMode === ActiveBranchMode.PROD;
  const teamProdBranchesMap =
    await getAllTeamsReposProdBranchesForOrgAsMap(orgId);

  const teamRepoFiltersMap =
    repoFiltersFromTeamProdBranches(teamProdBranchesMap);
  return {
    branches:
      ignoreBranches || useProdBranches
        ? null
        : branchMode === ActiveBranchMode.ALL
          ? '^'
          : branches,
    repo_filters: useProdBranches ? teamRepoFiltersMap[teamId] : null
  };
};

export const getBranchesAndRepoFilterAsPayload = async (params: {
  orgId: ID;
  teamIds: ID[];
  branches?: string;
  branchMode: ActiveBranchMode;
  ignoreBranches?: boolean;
  teamProdBranchesMap: Record<ID, TeamRepoBranchDetails[]>;
}) => {
  const { teamIds, branches, branchMode, ignoreBranches, teamProdBranchesMap } =
    params;

  const useProdBranches = branchMode === ActiveBranchMode.PROD;
  const teamRepoFiltersMap =
    repoFiltersFromTeamProdBranches(teamProdBranchesMap);

  const teamsPrFilters = await Promise.all(
    teamIds.map((teamId) =>
      updatePrFilterParams(
        teamId,
        {},
        {
          branches:
            ignoreBranches || useProdBranches
              ? null
              : branchMode === ActiveBranchMode.ALL
                ? '^'
                : branches,
          repo_filters: useProdBranches ? teamRepoFiltersMap[teamId] : null
        }
      ).then(({ pr_filter }) => ({
        pr_filter: pr_filter || null
      }))
    )
  );

  return teamsPrFilters;
};

export const getWorkFlowFilters = (params: {
  teamProdBranchesMap: Record<ID, TeamRepoBranchDetails[]>;
  teamIds: ID[];
}) => {
  const { teamProdBranchesMap, teamIds } = params;
  return Object.fromEntries(
    Object.entries(
      workFlowFiltersFromTeamProdBranches(teamProdBranchesMap)
    ).filter(([id]) => teamIds.includes(id))
  );
};

export const getWorkFlowFiltersAsPayloadForSingleTeam = async (params: {
  orgId: ID;
  teamId: ID;
}) => {
  const { orgId, teamId } = params;
  const teamProdBranchesMap =
    await getAllTeamsReposProdBranchesForOrgAsMap(orgId);
  return Object.fromEntries(
    Object.entries(workFlowFiltersFromTeamProdBranches(teamProdBranchesMap))
  )[teamId];
};
