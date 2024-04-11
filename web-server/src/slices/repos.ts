import { createSlice } from '@reduxjs/toolkit';
import { createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  uniq,
  groupBy,
  mapObjIndexed,
  prop,
  isNil,
  reject,
  find,
  propEq
} from 'ramda';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { AsyncSelectOption } from '@/components/AsyncSelect';
import { Row } from '@/constants/db';
import { Integration } from '@/constants/integrations';
import { RootState } from '@/store/index';
import { LoadedOrg } from '@/types/github';
import { StateFetchConfig } from '@/types/redux';
import {
  BaseRepo,
  RepoUniqueDetails,
  RepoWithMultipleWorkflows
} from '@/types/resources';
import { addFetchCasesToReducer } from '@/utils/redux';

type RepoSelectionMap = Record<BaseRepo['parent'], RepoUniqueDetails[]>;

type RepoWorkflowMap = Record<
  BaseRepo['name'],
  {
    value: Row<'RepoWorkflow'>['provider_workflow_id'];
    name: Row<'RepoWorkflow'>['name'];
  }[]
>;

type State = StateFetchConfig<{
  orgs: LoadedOrg[];
  repos: BaseRepo[];
  selectedOrg: BaseRepo['parent'] | null;
  selectionMap: RepoSelectionMap;
  workflowMap: RepoWorkflowMap;
  persistedConfig: {
    selectionMap: RepoSelectionMap;
    workflowMap: RepoWorkflowMap;
  };
  selectedTeam: AsyncSelectOption<ID> | null;
  teamRepoIds: Record<ID, true>;
  unassignedRepos: BaseRepo[];
}>;

const initialState: State = {
  orgs: [],
  repos: [],
  selectedOrg: null,
  selectionMap: {},
  workflowMap: {},
  persistedConfig: {
    selectionMap: {},
    workflowMap: {}
  },
  selectedTeam: null,
  teamRepoIds: {},
  unassignedRepos: []
};

export const reposSlice = createSlice({
  name: 'repos',
  initialState,
  reducers: {
    setOrg(state: State, action: PayloadAction<State['selectedOrg']>): void {
      state.selectedOrg = action.payload;
    },
    setTeam(state: State, action: PayloadAction<State['selectedTeam']>): void {
      state.selectedTeam = action.payload;
    },
    setTeamRepoIds(
      state: State,
      action: PayloadAction<State['teamRepoIds']>
    ): void {
      state.teamRepoIds = action.payload;
    },
    toggleRepo(state: State, action: PayloadAction<BaseRepo>): void {
      const repo = action.payload;
      const stateRepos = state.selectionMap[repo.parent] || [];
      const repoExists = find(propEq('idempotency_key', repo.id), stateRepos);

      state.selectionMap[repo.parent] = (
        repoExists
          ? stateRepos.filter(
              (stateRepo) => stateRepo.idempotency_key !== repo.id
            )
          : uniq(
              stateRepos.concat({
                idempotency_key: repo.id.toString(),
                name: repo.name,
                slug: repo.slug
              })
            )
      ).sort();
    },
    setRepoWorkflow(
      state: State,
      action: PayloadAction<{
        repo: BaseRepo['slug'];
        workflows: {
          value: Row<'RepoWorkflow'>['provider_workflow_id'];
          name: Row<'RepoWorkflow'>['name'];
        }[];
      }>
    ): void {
      state.workflowMap[action.payload.repo] = action.payload.workflows;
    },
    setUnassignedRepos(
      state: State,
      action: PayloadAction<State['unassignedRepos']>
    ): void {
      state.unassignedRepos = action.payload;
    }
  },
  extraReducers: (builder) => {
    addFetchCasesToReducer(
      builder,
      fetchProviderOrgs,
      'orgs',
      (state, action) => (state.orgs = action.payload)
    );
    addFetchCasesToReducer(
      builder,
      fetchReposForOrgFromProvider,
      'repos',
      (state, action) => (state.repos = action.payload)
    );

    addFetchCasesToReducer(
      builder,
      fetchSelectedRepos,
      'selectionMap',
      refreshState
    );
    addFetchCasesToReducer(
      builder,
      updatedRepoAndWorkflowSelection,
      'workflowMap',
      refreshState
    );
    addFetchCasesToReducer(
      builder,
      fetchUnassignedRepos,
      'unassignedRepos',
      (state, action) => (state.unassignedRepos = action.payload)
    );
  }
});

const refreshState = (
  state: State,
  action: {
    payload: RepoWithMultipleWorkflows[];
    type: string;
  }
) => {
  if (!action.payload.length) return state;

  if (!state.selectedOrg) state.selectedOrg = action.payload[0].org_name;
  state.selectionMap = mapObjIndexed(
    (group: RepoWithMultipleWorkflows[]) =>
      group
        .map((repo) => ({
          idempotency_key: repo.idempotency_key,
          name: repo.name,
          slug: repo.slug
        }))
        .sort(),
    groupBy(prop('org_name'), action.payload || [])
  );
  state.workflowMap = action.payload.reduce(
    (map, repo) => ({
      ...map,
      [repo.name]: repo.repo_workflows?.length
        ? repo.repo_workflows.map((wf) => ({
            value: wf?.provider_workflow_id,
            name: wf?.name
          }))
        : null
    }),
    {} as State['workflowMap']
  );

  state.persistedConfig.selectionMap = state.selectionMap;
  state.persistedConfig.workflowMap = state.workflowMap;
};

export const fetchUnassignedRepos = createAsyncThunk(
  'repos/fetchUnassignedRepos',
  async (params: { orgId: ID; provider: Integration }) => {
    return await handleApi<BaseRepo[]>(`/resources/unassigned_repos`, {
      params: { provider: params.provider, org_id: params.orgId }
    });
  }
);

export const fetchProviderOrgs = createAsyncThunk(
  'repos/fetchProviderOrgs',
  async (params: { orgId: ID; provider: Integration }) => {
    return await handleApi<LoadedOrg[]>(
      `/internal/${params.orgId}/git_provider_org`,
      { params: { provider: params.provider } }
    );
  }
);

export const fetchReposForOrgFromProvider = createAsyncThunk(
  'repos/fetchReposForOrgFromProvider',
  async (
    params: { orgId: ID; provider: Integration; orgName: string },
    { getState }
  ) => {
    const {
      repos: { selectedTeam }
    } = getState() as RootState;

    return await handleApi<BaseRepo[]>(
      `/internal/${params.orgId}/git_provider_org`,
      {
        params: {
          provider: params.provider,
          org_name: params.orgName,
          team_id: selectedTeam?.value
        }
      }
    ).then((repos) =>
      repos.map((repo) => ({ ...repo, id: repo.id.toString() }))
    );
  }
);

export const fetchSelectedRepos = createAsyncThunk(
  'repos/fetchSelectedRepos',
  async (params: { orgId: ID; provider: Integration }) => {
    return await handleApi<RepoWithMultipleWorkflows[]>(
      `/integrations/selected`,
      { params: { org_id: params.orgId, provider: params.provider } }
    );
  }
);

export const updatedRepoAndWorkflowSelection = createAsyncThunk(
  'repos/updatedRepoAndWorkflowSelection',
  async (params: {
    orgId: ID;
    provider: Integration;
    workflowMap: RepoWorkflowMap;
    selections: RepoSelectionMap;
    onError: (e: Error) => any;
  }) => {
    return await handleApi<RepoWithMultipleWorkflows[]>(`/integrations/orgs`, {
      method: 'PATCH',
      data: {
        org_id: params.orgId,
        orgRepos: params.selections,
        provider: params.provider,
        repoWorkflows: reject(isNil, params.workflowMap)
      }
    }).catch((e) => {
      params.onError(e);
      throw e;
    });
  }
);
