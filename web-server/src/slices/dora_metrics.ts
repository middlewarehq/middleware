import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { omit } from 'ramda';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { Row } from '@/constants/db';
import { StateFetchConfig } from '@/types/redux';
import {
  Deployment,
  PR,
  TeamDeploymentsApiResponse,
  DeploymentWithIncidents,
  IncidentsWithDeploymentResponseType,
  RepoFilterConfig,
  IncidentApiResponseType,
  ChangeTimeModes
} from '@/types/resources';
import { addFetchCasesToReducer } from '@/utils/redux';

import { TeamDoraMetricsApiResponseType } from '../types/resources';

export type State = StateFetchConfig<{
  firstLoadDone: boolean;
  activeChangeTimeMode: ChangeTimeModes;
  deploymentPrs: PR[];
  metrics_summary: Omit<
    TeamDoraMetricsApiResponseType,
    | 'allReposAssignedToTeam'
    | 'workflowConfiguredRepos'
    | 'deploymentsConfiguredForAllRepos'
    | 'deploymentsConfigured'
  >;
  allReposAssignedToTeam: (Row<'TeamRepos'> & Row<'OrgRepo'>)[];
  all_deployments: DeploymentWithIncidents[];
  resolved_incidents: IncidentsWithDeploymentResponseType[];
  team_deployments: TeamDeploymentsApiResponse;
  prs_map: Record<string, PR>;
  deployments_map: Record<string, Deployment>;
  revert_prs: PR[];
  summary_prs: PR[];
  unsyncedRepos: ID[];
}>;

const initialState: State = {
  firstLoadDone: false,
  activeChangeTimeMode: ChangeTimeModes.CYCLE_TIME,
  deploymentPrs: [],
  metrics_summary: null,
  allReposAssignedToTeam: [],
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
  summary_prs: [],
  unsyncedRepos: []
};

export const doraMetricsSlice = createSlice({
  name: 'dora_metrics',
  initialState,
  reducers: {
    resetDeployments(state: State) {
      state.deploymentPrs = [];
      state.team_deployments = initialState.team_deployments;
    },
    setFirstTeamLoadDone(state: State) {
      state.firstLoadDone = true;
    },
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
        state.allReposAssignedToTeam = action.payload.assigned_repos;
        state.summary_prs = action.payload.lead_time_prs;
        state.unsyncedRepos = action.payload.unsynced_repos;
      }
    );
    addFetchCasesToReducer(
      builder,
      fetchAllDeploymentsWithIncidents,
      'all_deployments',
      (state, action) => {
        state.all_deployments = action.payload.deployments_with_incidents;
        state.revert_prs = action.payload.revert_prs;
        // TODO: Impement when summary PRs are available
        // state.summary_prs = action.payload.summary_prs;
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
    addFetchCasesToReducer(
      builder,
      fetchDeploymentPRs,
      'deploymentPrs',
      (state, action) => (state.deploymentPrs = action.payload)
    );
    addFetchCasesToReducer(
      builder,
      getSyncedRepos,
      'unsyncedRepos',
      (state, action) => (state.unsyncedRepos = action.payload)
    );
  }
});

type DoraMetricsApiParamsType = {
  team_id: ID;
  from_date: Date;
  to_date: Date;
  branches?: string;
  repo_filters?: RepoFilterConfig;
};

export const fetchTeamDoraMetrics = createAsyncThunk(
  'dora_metrics/fetchTeamDoraMetrics',
  async (params: {
    teamId: ID;
    orgId: ID;
    fromDate: Date;
    toDate: Date;
    branches: string;
  }) => {
    return await handleApi<TeamDoraMetricsApiResponseType>(
      `internal/team/${params.teamId}/dora_metrics`,
      {
        params: {
          org_id: params.orgId,
          from_date: params.fromDate,
          to_date: params.toDate,
          branches: params.branches
        }
      }
    );
  }
);

export const fetchAllDeploymentsWithIncidents = createAsyncThunk(
  'dora_metrics/fetchAllIncidents',
  async (params: DoraMetricsApiParamsType & { org_id: ID }) => {
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

export const fetchDeploymentPRs = createAsyncThunk(
  'collab/fetchDeploymentPRs',
  async (params: { deployment_id: ID }) => {
    return await handleApi<PR[]>(`/internal/deployments/prs`, { params });
  }
);

export const getSyncedRepos = createAsyncThunk(
  'dora_metrics/getSyncedRepos',
  async (params: { team_id: ID }) => {
    return await handleApi<ID[]>(
      `/resources/teams/${params.team_id}/unsynced_repos`
    );
  }
);
