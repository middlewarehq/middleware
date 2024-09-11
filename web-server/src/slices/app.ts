import { createSlice } from '@reduxjs/toolkit';
import { PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { head, uniq } from 'ramda';

import { handleApi } from '@/api-helpers/axios-api-instance';
import {
  QuickRangeOptions,
  defaultDate
} from '@/components/DateRangePicker/utils';
import { Team } from '@/types/api/teams';
import { StateFetchConfig } from '@/types/redux';
import {
  TeamRepoBranchDetails,
  ActiveBranchMode,
  TeamSettings,
  FetchTeamSettingsAPIResponse,
  FetchTeamsResponse,
  ImageStatusApiResponse
} from '@/types/resources';
import { addFetchCasesToReducer } from '@/utils/redux';

import { fetchTeams } from './team';

type Error = {
  /* we'll add more fields later */
};

type Name = string;
type ErrorMap = Record<Name, Error>;
type GithubStarsAPIResponse = {
  stargazers_count: number;
};
export type SerializableDateRange = [string, string];
export type NetworkType = 'slow-2g' | '2g' | '3g' | '4g';

const githubRepoApiUrl = `https://api.github.com/repos/middlewarehq/middleware`;

// This state contains things that will generally be persisted to localStorage
type State = StateFetchConfig<{
  networkType: NetworkType;
  errors: ErrorMap;
  singleTeam: Team[];
  allTeams: Team[];
  /** ISO Timestamps with timezone */
  dateRange: SerializableDateRange;
  dateMode: QuickRangeOptions;
  branchMode: ActiveBranchMode;
  /** Comma separated branch names */
  branchNames: string;
  sidebarState: Record<string, boolean>;
  teamsProdBranchMap: Record<ID, TeamRepoBranchDetails[]>;
  isUpdated: boolean;
  prTableColumnsConfig: typeof DEFAULT_PR_TABLE_COLUMN_STATE_MAP;
  lastSyncedAt: Date | null;
  lastDisabledImageUpdateBannerAt: DateString | null;
  latestImageStatus: ImageStatusApiResponse | null;
  githubRepoStarsCount: number | null;
}>;

export const DEFAULT_PR_TABLE_COLUMN_STATE_MAP = {
  commits: true,
  lines_changed: true,
  comments: true,
  changed_files: false,
  rework_cycles: true,
  author: true,
  reviewers: false,
  first_commit_to_open: false,
  first_response_time: false,
  rework_time: false,
  merge_time: false,
  merge_to_deploy: false,
  lead_time: true,
  created_at: false,
  updated_at: false,
  head_branch: false,
  base_branch: false
};

const initialState: State = {
  networkType: '4g',
  errors: {},
  singleTeam: [],
  allTeams: [],
  dateRange: defaultDate.range.map((date) =>
    date.toISOString()
  ) as SerializableDateRange,
  dateMode: defaultDate.preset,
  branchMode: ActiveBranchMode.ALL,
  branchNames: '',
  teamsProdBranchMap: {},
  isUpdated: false,
  sidebarState: {},
  prTableColumnsConfig: DEFAULT_PR_TABLE_COLUMN_STATE_MAP,
  lastSyncedAt: null,
  lastDisabledImageUpdateBannerAt: null,
  latestImageStatus: null,
  githubRepoStarsCount: null
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setNetwork(state: State, action: PayloadAction<NetworkType>): void {
      state.networkType = action.payload;
    },
    setErrors(state: State, action: PayloadAction<ErrorMap>): void {
      state.errors = action.payload;
    },
    setSingleTeam(state: State, action: PayloadAction<Team[] | undefined>) {
      const teams = action.payload.filter((team) => !team?.is_deleted);
      state.singleTeam = teams;
    },
    setTeamProdBranchMap(
      state: State,
      action: PayloadAction<Record<ID, TeamRepoBranchDetails[]>>
    ) {
      state.teamsProdBranchMap = action.payload;
    },
    updateTeamProdBranchMap(
      state: State,
      action: PayloadAction<{
        teamId: ID;
        updatedProdBranchesArray: TeamRepoBranchDetails[];
      }>
    ) {
      state.teamsProdBranchMap[action.payload.teamId] =
        action.payload.updatedProdBranchesArray;
    },
    setDateRange(
      state: State,
      action: PayloadAction<{
        dateRange: SerializableDateRange;
        dateMode: QuickRangeOptions;
      }>
    ) {
      state.dateRange = action.payload.dateRange;
      state.dateMode = action.payload.dateMode;
    },
    setBranchState(
      state: State,
      action: PayloadAction<{
        names: State['branchNames'];
        mode: State['branchMode'];
      }>
    ) {
      const { mode, names } = action.payload;
      state.branchNames = uniq(names.split(','))
        .map((name) => `^${name.replace(/^\^/, '')}`)
        .join(',');

      state.branchMode = mode;
      state.isUpdated = true;
    },
    setBranchMode(state: State, action: PayloadAction<State['branchMode']>) {
      if (!state.branchNames.length) {
        state.branchMode = ActiveBranchMode.ALL;
      } else {
        state.branchMode = action.payload;
      }
      state.isUpdated = true;
    },
    setSidebarItemsState(
      state: State,
      action: PayloadAction<{ key: string; value: boolean }>
    ) {
      state.sidebarState = {
        ...(state.sidebarState || {}),
        [action.payload.key]: action.payload.value
      };
    },
    toggleSidebarItemsState(state: State, action: PayloadAction<string>) {
      if (!state.sidebarState[action.payload])
        state.sidebarState[action.payload] = true;
      else
        state.sidebarState[action.payload] =
          !state.sidebarState[action.payload];
    },
    setPrTableColumnConfig(
      state: State,
      action: PayloadAction<typeof DEFAULT_PR_TABLE_COLUMN_STATE_MAP>
    ): void {
      state.prTableColumnsConfig = action.payload;
    },
    setImageUpdateBannerAsDisabled(
      state: State,
      action: PayloadAction<Date | null>
    ) {
      state.lastDisabledImageUpdateBannerAt = action.payload
        ? new Date(action.payload).toISOString()
        : null;
    },
    setLatestImageStatus(
      state: State,
      action: PayloadAction<ImageStatusApiResponse | null>
    ) {
      state.latestImageStatus = action.payload;
    }
  },
  extraReducers: (builder) => {
    addFetchCasesToReducer(
      builder,
      updateTeamMemberDataSetting,
      'singleTeam',
      (state, action) => {
        state.singleTeam = state.singleTeam.map((team) => ({
          ...team,
          member_filter_enabled: action.payload
        }));
      }
    );
    addFetchCasesToReducer(
      builder,
      fetchTeams,
      'singleTeam',
      (state, action) => {
        state.allTeams = action.payload.teams;
        state.singleTeam = getSelectedTeam(
          state.singleTeam,
          action.payload.teams
        );
      }
    );
    addFetchCasesToReducer(
      builder,
      updateTeamBranchesMap,
      'allTeams',
      (state, action) => {
        state.teamsProdBranchMap = action.payload.teamReposProdBranchMap;
        const teamProdBranchNames =
          action.payload.teamReposProdBranchMap?.[head(state.singleTeam)?.id]
            ?.map((r) => r.prod_branches)
            .filter(Boolean)
            .join(',') || '';

        if (state.isUpdated) return;

        if (head(state.singleTeam)?.id) {
          state.branchMode = ActiveBranchMode.ALL;
          state.branchNames = teamProdBranchNames;
        } else {
          state.branchMode = ActiveBranchMode.PROD;
          state.branchNames = teamProdBranchNames;
        }
      }
    );
    addFetchCasesToReducer(
      builder,
      getGithubRepoStars,
      'githubRepoStarsCount',
      (state, action) => {
        state.githubRepoStarsCount = action.payload;
      }
    );
  }
});

export const updateTeamMemberDataSetting = createAsyncThunk(
  'app/updateTeamMemberDataSetting',
  async (params: { teamId: ID; enabled: boolean }) => {
    const response = await handleApi<
      FetchTeamSettingsAPIResponse<{
        should_apply_team_members_filter: boolean;
      }>
    >(`/internal/team/${params.teamId}/settings`, {
      method: 'PUT',
      data: {
        setting_type: TeamSettings.TEAM_MEMBER_METRICS_FILTER_SETTING,
        setting_data: { should_apply_team_members_filter: params.enabled }
      }
    });
    return Boolean(response.setting.should_apply_team_members_filter);
  }
);

export const updateTeamBranchesMap = createAsyncThunk(
  'app/updateTeamBranchesMap',
  async (params: { orgId: ID }) => {
    const { orgId } = params;
    return await handleApi<FetchTeamsResponse>(
      `/resources/orgs/${orgId}/teams/team_branch_map`
    );
  }
);

export const getGithubRepoStars = createAsyncThunk(
  'app/getGithubRepoStars',
  async () => {
    const res = await fetch(githubRepoApiUrl);
    const data: GithubStarsAPIResponse = await res.json();
    return data.stargazers_count;
  }
);

const getSelectedTeam = (
  selectedTeam: State['singleTeam'],
  allTeams: State['allTeams']
): Team[] => {
  if (!allTeams.length) return [];
  if (!selectedTeam.length) return getBiggestTeam(allTeams);
  if (!isSelectedTeamPresent(selectedTeam, allTeams)) {
    return getBiggestTeam(allTeams);
  }
  return selectedTeam;
};

const isSelectedTeamPresent = (
  selectedTeam: State['singleTeam'],
  allTeams: State['allTeams']
): boolean => {
  if (!selectedTeam.length) return false;
  if (!allTeams.length) return false;

  const selectedTeamId = selectedTeam[0].id;
  const allTeamIds = allTeams.map((team) => team.id);

  return allTeamIds.includes(selectedTeamId);
};

const getBiggestTeam = (allTeams: Team[]): Team[] => {
  if (!allTeams.length) return [];
  const biggestTeam = allTeams.reduce((acc, team) => {
    if (team.member_ids.length > acc.member_ids.length) return team;
    return acc;
  }, allTeams[0]);
  return [biggestTeam];
};
