import { createSlice } from '@reduxjs/toolkit';
import { createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

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
      fetchUnassignedRepos,
      'unassignedRepos',
      (state, action) => (state.unassignedRepos = action.payload)
    );
  }
});

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
  async (params: { orgId: ID; providers: Integration[] }) => {
    return await handleApi<LoadedOrg[]>(
      `/internal/${params.orgId}/git_provider_org`,
      { params: { providers: params.providers } }
    );
  }
);

export const fetchReposForOrgFromProvider = createAsyncThunk(
  'repos/fetchReposForOrgFromProvider',
  async (
    params: { orgId: ID; providers: Integration[]; orgName: string },
    { getState }
  ) => {
    const {
      repos: { selectedTeam }
    } = getState() as RootState;

    return await handleApi<BaseRepo[]>(
      `/internal/${params.orgId}/git_provider_org`,
      {
        params: {
          providers: params.providers,
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
