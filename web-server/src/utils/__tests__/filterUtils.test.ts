import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import { getAllTeamsReposProdBranchesForOrgAsMap } from '@/api/internal/team/[team_id]/repo_branches';
import * as teamApiHelperModule from '@/api-helpers/team';
import { ActiveBranchMode } from '@/types/resources';
import {
  getBranchesAndRepoFilter,
  getBranchesAndRepoFilterAsPayload,
  getWorkFlowFilters,
  getWorkFlowFiltersAsPayloadForSingleTeam
} from '@/utils/filterUtils';

jest.mock('@/api/internal/team/[team_id]/repo_branches', () => ({
  getAllTeamsReposProdBranchesForOrgAsMap: jest.fn(() => {
    return {
      '18d934c1-2699-41bd-af64-c0394ba32fdf': [
        {
          team_id: '18d934c1-2699-41bd-af64-c0394ba32fdf',
          org_repo_id: '35737b5a-7f35-4fbd-b86b-5c6052f4e206',
          name: 'Backend',
          prod_branches: ['^main$'],
          is_active: true
        }
      ],
      'd8403333-db90-453f-b187-3d78d6a3f7f0': [
        {
          team_id: 'd8403333-db90-453f-b187-3d78d6a3f7f0',
          org_repo_id: '35737b5a-7f35-4fbd-b86b-5c6052f4e206',
          name: 'Frontend',
          prod_branches: ['^main$'],
          is_active: true
        }
      ]
    };
  })
}));

jest
  .spyOn(teamApiHelperModule, 'getExcludedTicketTypesSetting')
  .mockImplementation(() => {
    return new Promise((resolve) => {
      resolve(['Sub-task', 'Subtask']);
    });
  });

describe('getBranchesAndRepoFilter', () => {
  it('should return null branches and repo_filters when branchMode is PROD', async () => {
    const result = await getBranchesAndRepoFilter({
      orgId: 'f48d7cce-25d4-41d1-903e-e09166677d92',
      teamId: '18d934c1-2699-41bd-af64-c0394ba32fdf',
      branchMode: ActiveBranchMode.PROD,
      branches: '^dev'
    });
    expect(getAllTeamsReposProdBranchesForOrgAsMap).toHaveBeenCalledWith(
      'f48d7cce-25d4-41d1-903e-e09166677d92'
    );
    expect(result).toEqual({
      branches: null,
      repo_filters: {
        '35737b5a-7f35-4fbd-b86b-5c6052f4e206': { base_branches: ['^main$'] }
      }
    });
  });

  it('should return provided branches when branchMode is CUSTOM', async () => {
    const result = await getBranchesAndRepoFilter({
      orgId: 'f48d7cce-25d4-41d1-903e-e09166677d92',
      teamId: '18d934c1-2699-41bd-af64-c0394ba32fdf',
      branchMode: ActiveBranchMode.CUSTOM,
      branches: '^dev'
    });
    expect(result).toEqual({ branches: '^dev', repo_filters: null });
  });
  it('should return ^ as branches when branchMode is ALL', async () => {
    const result = await getBranchesAndRepoFilter({
      orgId: 'f48d7cce-25d4-41d1-903e-e09166677d92',
      teamId: '18d934c1-2699-41bd-af64-c0394ba32fdf',
      branchMode: ActiveBranchMode.ALL,
      branches: '^dev'
    });
    expect(result).toEqual({ branches: '^', repo_filters: null });
  });
  it('should return null branches when ignoreBranches is true and branchMode is CUSTOM', async () => {
    const result = await getBranchesAndRepoFilter({
      orgId: 'f48d7cce-25d4-41d1-903e-e09166677d92',
      teamId: '18d934c1-2699-41bd-af64-c0394ba32fdf',
      branchMode: ActiveBranchMode.CUSTOM,
      ignoreBranches: true,
      branches: '^dev'
    });

    expect(result).toEqual({
      branches: null,
      repo_filters: null
    });
  });
  it('should return null branches when ignoreBranches is true and branchMode is PROD', async () => {
    const result = await getBranchesAndRepoFilter({
      orgId: 'f48d7cce-25d4-41d1-903e-e09166677d92',
      teamId: '18d934c1-2699-41bd-af64-c0394ba32fdf',
      branchMode: ActiveBranchMode.PROD,
      ignoreBranches: true,
      branches: '^dev'
    });
    expect(result).toEqual({
      branches: null,
      repo_filters: {
        '35737b5a-7f35-4fbd-b86b-5c6052f4e206': { base_branches: ['^main$'] }
      }
    });
  });
});

describe('getBranchesAndRepoFilterAsPayload', () => {
  const paramsForGetBranchesAndRepoFilterAsPayload = {
    orgId: 'f48d7cce-25d4-41d1-903e-e09166677d92',
    teamIds: ['18d934c1-2699-41bd-af64-c0394ba32fdf'],
    branches: '^main',
    branchMode: 'CUSTOM' as ActiveBranchMode,
    teamProdBranchesMap: {
      '18d934c1-2699-41bd-af64-c0394ba32fdf': [
        {
          team_id: '18d934c1-2699-41bd-af64-c0394ba32fdf',
          org_repo_id: '35737b5a-7f35-4fbd-b86b-5c6052f4e206',
          name: 'Backend',
          prod_branches: ['^main$'],
          is_active: true
        }
      ],
      'd8403333-db90-453f-b187-3d78d6a3f7f0': [
        {
          team_id: 'd8403333-db90-453f-b187-3d78d6a3f7f0',
          org_repo_id: '35737b5a-7f35-4fbd-b86b-5c6052f4e206',
          name: 'Frontend',
          prod_branches: ['^main$'],
          is_active: true
        }
      ]
    }
  };

  it('should return pr_filter with only base_branches for each team when branchMode is CUSTOM', async () => {
    const result = await getBranchesAndRepoFilterAsPayload({
      ...paramsForGetBranchesAndRepoFilterAsPayload
    });
    expect(result).toEqual([{ pr_filter: { base_branches: ['^main'] } }]);
  });

  it('should return pr_filter with only "^" as base_branches for each team when branchMode is ALL', async () => {
    const result = await getBranchesAndRepoFilterAsPayload({
      ...paramsForGetBranchesAndRepoFilterAsPayload,
      branchMode: ActiveBranchMode.ALL
    });
    expect(result).toEqual([{ pr_filter: { base_branches: ['^'] } }]);
  });
  it('should return pr_filter with only repo_filters for each team when branchMode is PROD', async () => {
    const result = await getBranchesAndRepoFilterAsPayload({
      ...paramsForGetBranchesAndRepoFilterAsPayload,
      branchMode: ActiveBranchMode.PROD
    });
    expect(result).toEqual([
      {
        pr_filter: {
          repo_filters: {
            '35737b5a-7f35-4fbd-b86b-5c6052f4e206': {
              base_branches: ['^main$']
            }
          }
        }
      }
    ]);
  });
  it('should return pr_filter with null base_branches for each team when ignoreBranches is true', async () => {
    const result = await getBranchesAndRepoFilterAsPayload({
      ...paramsForGetBranchesAndRepoFilterAsPayload,
      ignoreBranches: true
    });

    expect(result).toEqual([{ pr_filter: null }]);
  });
  it('should return pr_filter with null base_branches and repo filters for each team  when ignoreBranches is true and branchMode is PROD', async () => {
    const result = await getBranchesAndRepoFilterAsPayload({
      ...paramsForGetBranchesAndRepoFilterAsPayload,
      ignoreBranches: true,
      branchMode: ActiveBranchMode.PROD
    });
    expect(result).toEqual([
      {
        pr_filter: {
          repo_filters: {
            '35737b5a-7f35-4fbd-b86b-5c6052f4e206': {
              base_branches: ['^main$']
            }
          }
        }
      }
    ]);
  });
  it('should return pr_filter with null base_branches for each team  when ignoreBranches is true and branchMode is ALL', async () => {
    const result = await getBranchesAndRepoFilterAsPayload({
      ...paramsForGetBranchesAndRepoFilterAsPayload,
      ignoreBranches: true,
      branchMode: ActiveBranchMode.ALL
    });
    expect(result).toEqual([{ pr_filter: null }]);
  });
});

describe('getWorkFlowFilters', () => {
  const paramsForGetWorkflowFilter = {
    teamIds: ['18d934c1-2699-41bd-af64-c0394ba32fdf'],

    teamProdBranchesMap: {
      '18d934c1-2699-41bd-af64-c0394ba32fdf': [
        {
          team_id: '18d934c1-2699-41bd-af64-c0394ba32fdf',
          org_repo_id: '35737b5a-7f35-4fbd-b86b-5c6052f4e206',
          name: 'Backend',
          prod_branches: ['^main$'],
          is_active: true
        }
      ],
      'd8403333-db90-453f-b187-3d78d6a3f7f0': [
        {
          team_id: 'd8403333-db90-453f-b187-3d78d6a3f7f0',
          org_repo_id: '35737b5a-7f35-4fbd-b86b-5c6052f4e206',
          name: 'Frontend',
          prod_branches: ['^main$'],
          is_active: true
        }
      ]
    }
  };

  it('should return workflow filters for a single team', () => {
    const result = getWorkFlowFilters(paramsForGetWorkflowFilter);

    expect(result).toEqual({
      '18d934c1-2699-41bd-af64-c0394ba32fdf': {
        workflow_filter: { head_branches: ['^main$'] }
      }
    });
  });
  it('should return workflow filters for all teams', () => {
    const result = getWorkFlowFilters({
      teamIds: Object.keys(paramsForGetWorkflowFilter.teamProdBranchesMap),
      teamProdBranchesMap: paramsForGetWorkflowFilter.teamProdBranchesMap
    });

    expect(result).toEqual({
      '18d934c1-2699-41bd-af64-c0394ba32fdf': {
        workflow_filter: { head_branches: ['^main$'] }
      },
      'd8403333-db90-453f-b187-3d78d6a3f7f0': {
        workflow_filter: { head_branches: ['^main$'] }
      }
    });
  });
});

describe('getWorkFlowFiltersAsPayloadForSingleTeam', () => {
  it('should return workflow filters for a single team', async () => {
    const result = await getWorkFlowFiltersAsPayloadForSingleTeam({
      orgId: 'f48d7cce-25d4-41d1-903e-e09166677d92',
      teamId: '18d934c1-2699-41bd-af64-c0394ba32fdf'
    });

    expect(result).toEqual({ workflow_filter: { head_branches: ['^main$'] } });
  });

  // CLUSTOX: contributor filter. These two cases pin the payload against the
  // *backend's* parser rather than against this module's own output.
  // `ParseWorkflowFilterProcessor.apply` in
  // backend/analytics_server/mhq/service/workflows/workflow_filter.py reads
  // the JSON blob it is handed and does `workflow_filter.get("event_actors")`
  // on it -- the same level it reads `head_branches` from. That blob is the
  // value of the `workflow_filter` query param, so `event_actors` must be a
  // sibling of `head_branches`, never a sibling of `workflow_filter`. A
  // top-level key would also be an extra query param, which the PREVENT_EXTRA
  // voluptuous schema on /teams/<team_id>/deployment_frequency rejects with a
  // 400.
  it('should nest event_actors inside workflow_filter, where the backend parser reads it', async () => {
    const result = await getWorkFlowFiltersAsPayloadForSingleTeam({
      orgId: 'f48d7cce-25d4-41d1-903e-e09166677d92',
      teamId: '18d934c1-2699-41bd-af64-c0394ba32fdf',
      eventActors: ['octocat']
    });

    expect(result).toEqual({
      workflow_filter: {
        head_branches: ['^main$'],
        event_actors: ['octocat']
      }
    });
    // Guard the exact failure that shipped: a top-level sibling key is an
    // unrecognised query param and 400s the whole deployment frequency call.
    expect(result).not.toHaveProperty('event_actors');
  });

  it('should leave the payload unchanged when eventActors is omitted', async () => {
    const result = await getWorkFlowFiltersAsPayloadForSingleTeam({
      orgId: 'f48d7cce-25d4-41d1-903e-e09166677d92',
      teamId: '18d934c1-2699-41bd-af64-c0394ba32fdf',
      eventActors: []
    });

    expect(result).toEqual({ workflow_filter: { head_branches: ['^main$'] } });
  });
});
