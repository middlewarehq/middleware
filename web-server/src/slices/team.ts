import { createSlice } from '@reduxjs/toolkit';
import { createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { Row } from '@/constants/db';
import { FetchState } from '@/constants/ui-states';
import { DB_OrgRepo } from '@/types/api/org_repo';
import { BaseTeam, Team, DB_TeamRepo } from '@/types/api/teams';
import { StateFetchConfig } from '@/types/redux';
import {
  BaseUser,
  TeamRepoBranchDetails,
  TeamSelectedIncidentServicesBFFApiResponse,
  TeamIncidentSettingsResponse,
  IncidentSettings,
  PR,
  IncidentApiResponseTypes,
  IncidentTeamsAndService
} from '@/types/resources';
import { addFetchCasesToReducer } from '@/utils/redux';
import { getUrlParam } from '@/utils/url';

export type PeopleResources = {
  users: Record<string, BaseUser>;
  teams: Record<string, BaseTeam>;
};

type State = StateFetchConfig<{
  people: PeopleResources;
  relations: any;

  fetch_state: FetchState;
  fetch_error: string;
  teams: Team[];
  users: Record<User['id'], User>;
  showAllTeams?: boolean;
  orgRepos: DB_OrgRepo[];
  teamRepos: DB_OrgRepo[];
  orgProjects: Row<'OrgProject'>[];
  teamProjects: Row<'OrgProject'>[];
  orgServices: IncidentTeamsAndService[];
  teamServices: IncidentTeamsAndService[];
  teamReposProductionBranches: TeamRepoBranchDetails[];
  teamIncidentFilters: null | TeamIncidentSettingsResponse;
  excludedPrs: PR[];
}>;

export type TeamSliceState = State;

const initialState: State = {
  people: {
    teams: {},
    users: {}
  },

  relations: null,
  requests: {
    relations: FetchState.DORMANT,
    people: FetchState.DORMANT
  },
  errors: {},

  fetch_state: FetchState.DORMANT,
  fetch_error: '',
  teams: [],
  users: {},
  showAllTeams: getUrlParam('show_all') !== 'false',
  orgRepos: [],
  teamRepos: [],
  orgProjects: [],
  teamProjects: [],
  orgServices: [],
  teamServices: [],
  teamReposProductionBranches: [],
  teamIncidentFilters: null,
  excludedPrs: []
};

export const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    setTeamRepos(
      state: State,
      action: PayloadAction<State['teamRepos']>
    ): void {
      state.teamRepos = action.payload;
    },

    setTeamProjects(
      state: State,
      action: PayloadAction<State['teamProjects']>
    ): void {
      state.teamProjects = action.payload;
    },

    setTeamIncidentServices(
      state: State,
      action: PayloadAction<State['teamServices']>
    ): void {
      state.teamServices = action.payload;
    },

    setShowAllTeams(
      state: State,
      action: PayloadAction<State['showAllTeams']>
    ): void {
      state.showAllTeams = action.payload;
    }
  },
  extraReducers: (builder) => {
    addFetchCasesToReducer(
      builder,
      fetchPeopleResources,
      'people',
      (state, action) => (state.people = action.payload)
    );
    addFetchCasesToReducer(
      builder,
      fetchUserRelations,
      'relations',
      (state, action) => (state.relations = action.payload)
    );

    addFetchCasesToReducer(
      builder,
      fetchRepos,
      'teamRepos',
      (state, action) => {
        state.orgRepos = action.payload.orgRepos;
        state.teamRepos = action.payload.teamRepos;
      }
    );
    addFetchCasesToReducer(
      builder,
      fetchProjects,
      'teamProjects',
      (state, action) => {
        state.orgProjects = action.payload.orgProjects;
        state.teamProjects = action.payload.teamProjects;
      }
    );
    addFetchCasesToReducer(
      builder,
      fetchIncidentServices,
      'teamProjects',
      (state, action) => {
        state.orgServices = action.payload.orgServices;
        state.teamServices = action.payload.teamServices;
      }
    );
    addFetchCasesToReducer(builder, fetchTeams, 'teams', (state, action) => {
      state.teams = action.payload.teams;
      state.users = action.payload.users;
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

export const fetchPeopleResources = createAsyncThunk(
  'team/fetchPeopleResources',
  async (params: { org_id: string }) => {
    const response = await axios.get<PeopleResources>(
      `/api/resources/orgs/${params.org_id}/people_resources`
    );
    return response.data;
  }
);

export const fetchUserRelations = createAsyncThunk(
  'team/fetchUserRelations',
  async (params: { user_id: string }) => {
    const response = await axios.get(
      `/api/internal/users/${params.user_id}/relations`
    );
    return response.data;
  }
);

export const fetchRepos = createAsyncThunk(
  'teams/fetchRepos',
  async (params: { team_id: ID; org_id: ID }) => {
    return await getOrgAndTeamRepos(params.team_id, params.org_id);
  }
);

export const fetchProjects = createAsyncThunk(
  'teams/fetchProjects',
  async (params: { team_id: ID; org_id: ID }) => {
    return await getOrgAndTeamProjects(params.team_id, params.org_id);
  }
);

export const fetchIncidentServices = createAsyncThunk(
  'teams/fetchIncidentServices',
  async (params: { team_id: ID; org_id: ID }) => {
    return await getOrgAndTeamIncidentServices(params.team_id, params.org_id);
  }
);

export const fetchTeams = createAsyncThunk(
  'teams/fetchTeams',
  async (params: { user_id?: ID; include_teams?: ID[]; org_id: ID }) => {
    return await handleApi<{
      teams: Team[];
      users: Record<User['id'], User>;
    }>(`/resources/orgs/${params.org_id}/teams/v2`, { params });
  }
);

const getOrgAndTeamRepos = async (team_id: ID, org_id: ID) => {
  if (!team_id || !org_id) return null;

  const [orgRepos, teamRepos] = await Promise.all([
    handleApi<DB_OrgRepo[]>(`/resources/orgs/${org_id}/repos`),
    handleApi<DB_TeamRepo[]>(`/resources/team_repos`, {
      params: { team_id }
    })
  ]);

  if (!orgRepos || !teamRepos) return null;

  // Keep only those repos that match the team ID in the URL
  const filteredRouteRepos = teamRepos.filter(
    (repo) => repo.team_id === team_id
  );

  const filteredOrgRepos = filteredRouteRepos
    .map((repo) => orgRepos.find((orgRepo) => repo.org_repo_id === orgRepo.id))
    .filter(Boolean);

  return {
    orgRepos,
    teamRepos: filteredOrgRepos
  };
};

const getOrgAndTeamProjects = async (team_id: ID, org_id: ID) => {
  if (!team_id || !org_id) return null;

  const [orgProjects, teamProjects] = await Promise.all([
    handleApi<Row<'OrgProject'>[]>(`/resources/orgs/${org_id}/projects`),
    handleApi<Row<'TeamProjects'>[]>(`/resources/teams/${team_id}/projects`)
  ]);

  if (!orgProjects || !teamProjects) return null;

  // Keep only those Projects that match the team ID in the URL
  const filteredRouteProjects = teamProjects.filter(
    (p) => p.team_id === team_id
  );

  const filteredOrgProjects = filteredRouteProjects
    .map((p) => orgProjects.find((op) => p.org_project_id === op.id))
    .filter(Boolean);

  return {
    orgProjects,
    teamProjects: filteredOrgProjects
  };
};

const getOrgAndTeamIncidentServices = async (team_id: ID, org_id: ID) => {
  if (!team_id || !org_id) return null;

  const {
    org_incident_services: orgServices,
    team_incident_services: teamServices,
    incident_provider_all_teams: orgAllIncidentProviderTeams,
    incident_provider_assigned_teams: orgAssignedIncidentProviderTeams
  } = await handleApi<TeamSelectedIncidentServicesBFFApiResponse>(
    `/internal/team/${team_id}/incident_services`,
    { params: { org_id } }
  );

  if (!orgServices || !teamServices) return null;

  // Keep only those Projects that match the team ID in the URL
  const filteredRouteServices = teamServices.filter(
    (p) => p.team_id === team_id
  );

  const filteredOrgServices = filteredRouteServices
    .map((p) => orgServices.find((op) => p.service_id === op.id))
    .filter(Boolean);

  return {
    orgServices: [
      ...adaptIncidentTeamsAndServices(
        orgServices,
        IncidentApiResponseTypes.INCIDENT_PROVIDER_SERVICE
      ),
      ...adaptIncidentTeamsAndServices(
        orgAllIncidentProviderTeams,
        IncidentApiResponseTypes.INCIDENT_PROVIDER_TEAM
      )
    ],
    teamServices: [
      ...adaptIncidentTeamsAndServices(
        filteredOrgServices,
        IncidentApiResponseTypes.INCIDENT_PROVIDER_SERVICE
      ),
      ...adaptIncidentTeamsAndServices(
        orgAssignedIncidentProviderTeams,
        IncidentApiResponseTypes.INCIDENT_PROVIDER_TEAM
      )
    ]
  };
};

export const adaptIncidentTeamsAndServices = <T>(
  arr: T[],
  type: IncidentApiResponseTypes
) => arr.map((t) => ({ ...t, type }));

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
