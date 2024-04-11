import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { omit } from 'ramda';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { StateFetchConfig } from '@/types/redux';
import {
  Deployment,
  PR,
  TeamDeploymentsApiResponse,
  DeploymentWithIncidents,
  IncidentsWithDeploymentResponseType,
  RepoWithSingleWorkflow,
  ManagerTeamsMap,
  RepoFilterConfig,
  TeamDeploymentsConfigured,
  IncidentApiResponseType,
  ChangeTimeModes
} from '@/types/resources';
import { addFetchCasesToReducer } from '@/utils/redux';

import { TeamDoraMetricsApiResponseType } from '../types/resources';

export type State = StateFetchConfig<{
  firstLoadDone: boolean;
  activeChangeTimeMode: ChangeTimeModes;
  metrics_summary: Omit<
    TeamDoraMetricsApiResponseType,
    | 'allReposAssignedToTeam'
    | 'workflowConfiguredRepos'
    | 'deploymentsConfiguredForAllRepos'
    | 'deploymentsConfigured'
  >;
  allReposAssignedToTeam: RepoWithSingleWorkflow[];
  workflowConfiguredRepos: RepoWithSingleWorkflow[];
  deploymentsConfigured: TeamDeploymentsConfigured['deployments_configured'];
  deploymentsConfiguredForAllRepos: TeamDeploymentsConfigured['deployments_configured_for_all_repos'];
  all_deployments: DeploymentWithIncidents[];
  resolved_incidents: IncidentsWithDeploymentResponseType[];
  team_deployments: TeamDeploymentsApiResponse;
  prs_map: Record<string, PR>;
  deployments_map: Record<string, Deployment>;
  revert_prs: PR[];
  summary_prs: PR[];
}>;

const initialState: State = {
  firstLoadDone: false,
  activeChangeTimeMode: ChangeTimeModes.CYCLE_TIME,
  metrics_summary: null,
  allReposAssignedToTeam: [],
  workflowConfiguredRepos: [],
  deploymentsConfigured: false,
  deploymentsConfiguredForAllRepos: false,
  all_deployments: [],
  resolved_incidents: [],
  team_deployments: {
    deployments_map: {},
    repos_map: {},
    workflows_map: {}
  },
  prs_map: {},
  deployments_map: {},
  revert_prs: [],
  summary_prs: []
};

export const doraMetricsSlice = createSlice({
  name: 'dora_metrics',
  initialState,
  reducers: {
    toggleActiveModeValue(
      state: State,
      action: PayloadAction<ChangeTimeModes>
    ) {
      state.activeChangeTimeMode =
        action.payload ||
        (state.activeChangeTimeMode === ChangeTimeModes.CYCLE_TIME
          ? ChangeTimeModes.LEAD_TIME
          : ChangeTimeModes.CYCLE_TIME);
    }
  },
  extraReducers: (builder) => {
    addFetchCasesToReducer(
      builder,
      fetchTeamDoraMetrics,
      'metrics_summary',
      (state, action) => {
        state.firstLoadDone = true;
        state.metrics_summary = omit(
          [
            'allReposAssignedToTeam',
            'workflowConfiguredRepos',
            'deploymentsConfiguredForAllRepos',
            'deploymentsConfigured'
          ],
          action.payload
        );
        state.allReposAssignedToTeam = action.payload.allReposAssignedToTeam;
        state.workflowConfiguredRepos = action.payload.workflowConfiguredRepos;
        state.deploymentsConfigured = action.payload.deploymentsConfigured;
        state.deploymentsConfiguredForAllRepos =
          action.payload.deploymentsConfiguredForAllRepos;
      }
    );
    addFetchCasesToReducer(
      builder,
      fetchAllDeploymentsWithIncidents,
      'all_deployments',
      (state, action) => {
        state.all_deployments = action.payload.deployments_with_incidents;
        state.revert_prs = action.payload.revert_prs;
        state.summary_prs = action.payload.summary_prs;
      }
    );
    addFetchCasesToReducer(
      builder,
      fetchAllResolvedIncidents,
      'resolved_incidents',
      (state, action) => (state.resolved_incidents = action.payload)
    );
    addFetchCasesToReducer(
      builder,
      fetchTeamDeployments,
      'team_deployments',
      (state, action) => (state.team_deployments = action.payload)
    );
  }
});

type DoraMetricsApiParamsType = {
  team_id: string;
  from_date: Date;
  to_date: Date;
  branches?: string;
  repo_filters?: RepoFilterConfig;
};

export const fetchTeamDoraMetrics = createAsyncThunk(
  'dora_metrics/fetchTeamDoraMetrics',
  async (
    params: DoraMetricsApiParamsType & {
      org_id: ID;
      manager_teams_array: ManagerTeamsMap[];
    }
  ) => {
    return await handleApi<TeamDoraMetricsApiResponseType>(
      `internal/team/${params.team_id}/dora_metrics`,
      {
        params: {
          ...params,
          manager_teams_array: JSON.stringify(params.manager_teams_array)
        }
      }
    );
  }
);

export const fetchAllDeploymentsWithIncidents = createAsyncThunk(
  'dora_metrics/fetchAllIncidents',
  async (params: DoraMetricsApiParamsType) => {
    return await handleApi<IncidentApiResponseType>(
      `internal/team/${params.team_id}/get_incidents`,
      {
        params
      }
    );
  }
);

export const fetchAllResolvedIncidents = createAsyncThunk(
  'dora_metrics/fetchAllResolvedIncidents',
  async (params: DoraMetricsApiParamsType) => {
    return await handleApi<IncidentsWithDeploymentResponseType[]>(
      `internal/team/${params.team_id}/resolved_incidents`,
      {
        params
      }
    );
  }
);

export const fetchTeamDeployments = createAsyncThunk(
  'dora_metrics/fetchTeamDeployments',
  async (params: DoraMetricsApiParamsType) => {
    return await handleApi<TeamDeploymentsApiResponse>(
      `/internal/team/${params.team_id}/deployment_analytics`,
      { params }
    );
  }
);
