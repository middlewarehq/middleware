import { createSlice } from '@reduxjs/toolkit';
import { PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { uniq } from 'ramda';

import { handleApi } from '@/api-helpers/axios-api-instance';
import {
  defaultRange,
  QuickRangeOptions
} from '@/components/DateRangePicker/utils';
import { Team } from '@/types/api/teams';
import { StateFetchConfig } from '@/types/redux';
import {
  TeamRepoBranchDetails,
  ActiveBranchMode,
  TeamSettings,
  FetchTeamSettingsAPIResponse
} from '@/types/resources';
import { addFetchCasesToReducer } from '@/utils/redux';

type Error = {
  /* we'll add more fields later */
};

type Name = string;
type ErrorMap = Record<Name, Error>;
export type SerializableDateRange = [string, string];
export type NetworkType = 'slow-2g' | '2g' | '3g' | '4g';

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
  lead_time_as_sum_of_parts: true,
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
  dateRange: defaultRange.map((date) =>
    date.toISOString()
  ) as SerializableDateRange,
  dateMode: 'oneMonth',
  branchMode: ActiveBranchMode.ALL,
  branchNames: '',
  teamsProdBranchMap: null,
  isUpdated: false,
  sidebarState: {},
  prTableColumnsConfig: DEFAULT_PR_TABLE_COLUMN_STATE_MAP
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
