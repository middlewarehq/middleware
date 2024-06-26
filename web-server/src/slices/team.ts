import { createSlice } from '@reduxjs/toolkit';
import { createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { Integration } from '@/constants/integrations';
import { FetchState } from '@/constants/ui-states';
import { BaseTeam, Team } from '@/types/api/teams';
import { StateFetchConfig } from '@/types/redux';
import {
  BaseUser,
  TeamRepoBranchDetails,
  TeamIncidentSettingsResponse,
  IncidentSettings,
  PR,
  BaseRepo,
  RepoUniqueDetails,
  DB_OrgRepo
} from '@/types/resources';
import { addFetchCasesToReducer } from '@/utils/redux';
import { getUrlParam } from '@/utils/url';

export type PeopleResources = {
  users: Record<string, BaseUser>;
  teams: Record<string, BaseTeam>;
};

type State = StateFetchConfig<{
  fetch_state: FetchState;
  fetch_error: string;
  teams: Team[];
  showAllTeams?: boolean;
  teamRepos: DB_OrgRepo[];
  teamReposProductionBranches: TeamRepoBranchDetails[];
  teamIncidentFilters: null | TeamIncidentSettingsResponse;
  excludedPrs: PR[];
  teamReposMaps: null | Record<ID, DB_OrgRepo[]>;
}>;

export type TeamSliceState = State;

const initialState: State = {
  errors: {},
  fetch_state: FetchState.DORMANT,
  fetch_error: '',
  teams: [],
  showAllTeams: getUrlParam('show_all') !== 'false',
  teamRepos: [],
  teamReposProductionBranches: [],
  teamIncidentFilters: null,
  excludedPrs: [],
  teamReposMaps: {}
};

export const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    setTeams(state: State, action: PayloadAction<State['teams']>): void {
      state.teams = action.payload;
    },
    setTeamReposMaps(
      state: State,
      action: PayloadAction<State['teamReposMaps']>
    ): void {
      state.teamReposMaps = action.payload;
    },
    setTeamRepos(
      state: State,
      action: PayloadAction<State['teamRepos']>
    ): void {
      state.teamRepos = action.payload;
    },
    setShowAllTeams(
      state: State,
      action: PayloadAction<State['showAllTeams']>
    ): void {
      state.showAllTeams = action.payload;
    }
  },
  extraReducers: (builder) => {
    addFetchCasesToReducer(builder, fetchTeams, 'teams', (state, action) => {
      state.teams = action.payload.teams;
      state.teamReposMaps = action.payload.teamReposMap;
    });
    addFetchCasesToReducer(
      builder,
      fetchTeamReposProductionBranches,
      'teamReposProductionBranches',
      (state, action) => {
        state.teamReposProductionBranches = action.payload;
      }
    );
    addFetchCasesToReducer(
      builder,
      updateTeamReposProductionBranches,
      'teamReposProductionBranches',
      (state, action) => {
        state.teamReposProductionBranches = action.payload;
      }
    );
    addFetchCasesToReducer(
      builder,
      fetchTeamIncidentsFilter,
      'teamIncidentFilters',
      (state, action) => {
        state.teamIncidentFilters = action.payload;
      }
    );
    addFetchCasesToReducer(
      builder,
      updateTeamIncidentsFilter,
      'teamIncidentFilters',
      (state, action) => {
        state.teamIncidentFilters = action.payload;
      }
    );
    addFetchCasesToReducer(
      builder,
      fetchExcludedPrs,
      'excludedPrs',
      (state, action) => {
        state.excludedPrs = action.payload.excluded_prs;
      }
    );
    addFetchCasesToReducer(
      builder,
      updateExcludedPrs,
      'excludedPrs',
      (state, action) => {
        state.excludedPrs = action.payload.excluded_prs;
      }
    );
  }
});

export const fetchTeams = createAsyncThunk(
  'teams/fetchTeams',
  async (params: { org_id: ID; provider: Integration }) => {
    return await handleApi<{
      teams: Team[];
      teamReposMap: Record<ID, DB_OrgRepo[]>;
    }>(`/resources/orgs/${params.org_id}/teams/v2`, {
      params
    });
  }
);

export const fetchOrgRepos = createAsyncThunk(
  'teams/fetchOrgRepos',
  async (params: {
    org_id: ID;
    provider: Integration;
    search_text?: string;
  }) => {
    return await handleApi<BaseRepo[]>(
      `/internal/${params.org_id}/git_provider_org`,
      {
        params: { provider: params.provider, search_text: params.search_text }
      }
    );
  }
);

export const createTeam = createAsyncThunk(
  'teams/createTeam',
  async (params: {
    org_id: ID;
    team_name: string;
    org_repos: Record<string, RepoUniqueDetails[]>;
    provider: Integration;
  }) => {
    const { org_id, team_name, org_repos, provider } = params;
    return await handleApi<BaseTeam>(`/resources/orgs/${org_id}/teams/v2`, {
      method: 'POST',
      data: {
        name: team_name,
        org_repos: org_repos,
        provider: provider
      }
    });
  }
);

export const updateTeam = createAsyncThunk(
  'teams/updateTeam',
  async (params: {
    team_id: ID;
    team_name: string;
    org_id: ID;
    org_repos: Record<string, RepoUniqueDetails[]>;
    provider: Integration;
  }) => {
    const { team_id, team_name, org_id, org_repos, provider } = params;
    return await handleApi<BaseTeam>(`/resources/orgs/${org_id}/teams/v2`, {
      method: 'PATCH',
      data: {
        name: team_name,
        org_repos: org_repos,
        provider: provider,
        id: team_id
      }
    });
  }
);

export const fetchTeamReposProductionBranches = createAsyncThunk(
  'teams/teamReposProductionBranches',
  async (params: { team_id: ID }) => {
    return await handleApi<TeamRepoBranchDetails[]>(
      `/internal/team/${params.team_id}/repo_branches`
    );
  }
);

export const updateTeamReposProductionBranches = createAsyncThunk(
  'teams/updateTeamReposProductionBranches',
  async (params: { team_id: ID; team_repos_data: TeamRepoBranchDetails[] }) => {
    return await handleApi<TeamRepoBranchDetails[]>(
      `/internal/team/${params.team_id}/repo_branches`,
      {
        method: 'PUT',
        data: { team_repos_data: params.team_repos_data }
      }
    );
  }
);

export const fetchTeamIncidentsFilter = createAsyncThunk(
  'teams/fetchTeamIncidentsFilter',
  async (params: { team_id: ID; user_id: ID }) => {
    return await handleApi<TeamIncidentSettingsResponse>(
      `/internal/team/${params.team_id}/incidents_filter`,
      {
        method: 'GET',
        params: {
          user_id: params.user_id
        }
      }
    );
  }
);

export const updateTeamIncidentsFilter = createAsyncThunk(
  'teams/updateTeamIncidentsFilter',
  async (params: { team_id: ID; user_id: ID; setting: IncidentSettings }) => {
    return await handleApi<TeamIncidentSettingsResponse>(
      `/internal/team/${params.team_id}/incidents_filter`,
      {
        method: 'PUT',
        data: { updated_by: params.user_id, setting: params.setting }
      }
    );
  }
);
export const fetchExcludedPrs = createAsyncThunk(
  'teams/fetchExcludedPrs',
  async (params: { teamId: ID }) => {
    return await handleApi<{ excluded_prs: PR[] }>(
      `/internal/team/${params.teamId}/excluded_prs`
    );
  }
);

export const updateExcludedPrs = createAsyncThunk(
  'teams/updateExcludedPrs',
  async (params: { teamId: ID; excludedPrs: PR[] }) => {
    return handleApi<{ excluded_prs: PR[] }>(
      `/internal/team/${params.teamId}/excluded_prs`,
      {
        method: 'PUT',
        data: {
          team_id: params.teamId,
          excluded_prs: params.excludedPrs
        }
      }
    );
  }
);

export const deleteTeam = createAsyncThunk(
  'teams/deleteTeam',
  async (params: { org_id: ID; team_id: ID }) => {
    return await handleApi<BaseTeam>(
      `/resources/orgs/${params.org_id}/teams/v2`,
      {
        method: 'DELETE',
        data: {
          id: params.team_id
        }
      }
    );
  }
);
