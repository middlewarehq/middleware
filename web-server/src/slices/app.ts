import { createSlice } from '@reduxjs/toolkit';
import { PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { reject, uniq } from 'ramda';

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
  FetchTeamSettingsAPIResponse,
  ChangeTimeModes,
  CockpitBranchMode
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
  /** @deprecated Use `orgChartTeamSelection` instead. */
  multiTeam: Team[];
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
  manualSync: { inProgress: boolean; lastSynced?: string };
  prTableColumnsConfig: typeof DEFAULT_PR_TABLE_COLUMN_STATE_MAP;
  changeTimeDefaultSelectedOption: ChangeTimeModes;
  cockpitBranchMode: CockpitBranchMode;
}>;

export const DEFAULT_COLUMN_STATE_MAP = {
  assignee: true,
  reporter: false,
  project: false,
  status: true,
  started_at: true,
  completed_at: true,
  story_points: true,
  time_spent: true,
  type: true,
  current_sprint: false,
  sprint_history: false,
  is_planned: false,
  dropped: false,
  spilled: false,
  carried_over: false,
  priority: true,
  created_at: false,
  updated_at: false
};

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
  cycle_time: true,
  merge_to_deploy: false,
  lead_time_as_sum_of_parts: false,
  created_at: false,
  updated_at: false,
  head_branch: false,
  base_branch: false
};

export const DEFAULT_COCKPIT_TABLE_COLUMN_STATE_MAP_V2 = {
  first_commit_to_open: false,
  first_response_time: false,
  rework_time: false,
  merge_time: false,
  cycle_time: true,
  merge_to_deploy: false,
  lead_time: true,
  completion_percentage: true,
  planned_tickets_percentage: false,
  previous_tickets_percentage: false,
  adhoc_tickets_percentage: false,
  adhoc_tasks_tickets_percentage: false,
  adhoc_bugs_tickets_percentage: false,
  dropped_tickets_percentage: false,
  spillover_tickets_percentage: false,
  bugs_percentage: true,
  prs_merged_without_review: true,
  planned_ticket_success_rate: true,
  deployment_frequency: false,
  change_failure_rate: false,
  mean_time_to_restore: false
};

const initialState: State = {
  networkType: '4g',
  errors: {},
  singleTeam: [],
  multiTeam: [],
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
  manualSync: { inProgress: false },
  prTableColumnsConfig: DEFAULT_PR_TABLE_COLUMN_STATE_MAP,
  changeTimeDefaultSelectedOption: ChangeTimeModes.CYCLE_TIME,
  cockpitBranchMode: CockpitBranchMode.PROD
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
    /** @deprecated Use `setAllTeams` from appSlice instead */
    setMultiTeam(state: State, action: PayloadAction<Team[] | undefined>) {
      const teams = action.payload.filter((team) => !team?.is_deleted);
      state.multiTeam = teams;
    },
    removeTeam(state: State, action: PayloadAction<Team | undefined>) {
      if (!action.payload) return;

      const teamComparator = (team: Team) => team.id === action.payload.id;

      state.singleTeam = reject(teamComparator, state.singleTeam);
      state.multiTeam = reject(teamComparator, state.multiTeam);
    },
    toggleMultiTeam(state: State, action: PayloadAction<Team | undefined>) {
      const teamComparator = (team: Team) => team.id === action.payload.id;

      if (action.payload.is_deleted) {
        state.multiTeam = reject(teamComparator, state.multiTeam);
        return;
      }

      const exists = !!state.multiTeam.find(teamComparator);

      if (!exists) state.multiTeam.push(action.payload);
      else state.multiTeam = reject(teamComparator, state.multiTeam);
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
    setCockpitBranchMode(
      state: State,
      action: PayloadAction<{ mode: CockpitBranchMode }>
    ) {
      state.cockpitBranchMode = action.payload.mode;
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
    setManualSync(state: State, action: PayloadAction<State['manualSync']>) {
      state.manualSync = action.payload;
    },
    setPrTableColumnConfig(
      state: State,
      action: PayloadAction<typeof DEFAULT_PR_TABLE_COLUMN_STATE_MAP>
    ): void {
      state.prTableColumnsConfig = action.payload;
    },
    setChangeTimeSelectedOption(
      state: State,
      action: PayloadAction<ChangeTimeModes>
    ): void {
      state.changeTimeDefaultSelectedOption = action.payload;
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
        state.multiTeam = state.multiTeam.map((team) => ({
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
