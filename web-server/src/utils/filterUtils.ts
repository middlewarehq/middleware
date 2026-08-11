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
  // CLUSTOX: contributor filter. Deployments have no author, so the nearest
  // equivalent is the actor who triggered the run.
  eventActors?: string[];
}) => {
  const { orgId, teamId, eventActors } = params;
  const teamProdBranchesMap =
    await getAllTeamsReposProdBranchesForOrgAsMap(orgId);
  const filter = Object.fromEntries(
    Object.entries(workFlowFiltersFromTeamProdBranches(teamProdBranchesMap))
  )[teamId];

  if (!eventActors?.length) return filter;
  // CLUSTOX: `event_actors` belongs *inside* the workflow_filter blob, next to
  // `head_branches`. The backend reads it at that level -- see
  // ParseWorkflowFilterProcessor.apply in
  // mhq/service/workflows/workflow_filter.py, which does
  // `workflow_filter.get("event_actors")` on the parsed blob. Hanging it off
  // the top level instead makes it a sibling query param, and the
  // PREVENT_EXTRA voluptuous schema on /teams/<team_id>/deployment_frequency
  // rejects the whole request.
  return {
    ...filter,
    workflow_filter: { ...filter?.workflow_filter, event_actors: eventActors }
  };
};
