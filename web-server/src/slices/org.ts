import { createSlice } from '@reduxjs/toolkit';
import { PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { Integration } from '@/constants/integrations';
import { StateFetchConfig } from '@/types/redux';
import {
  BaseUser,
  DBUserRow,
  OrgAlertSettings,
  OrgDefaultSyncDaysSettings
} from '@/types/resources';
import { addFetchCasesToReducer } from '@/utils/redux';

type State = StateFetchConfig<{
  admins: BaseUser[];
  members: Record<ID, User>;
  syncAlertsAsIncidents: boolean;
  defaultSyncDays: number;
}>;

const initialState: State = {
  admins: [],
  members: {},
  syncAlertsAsIncidents: false,
  defaultSyncDays: null
};

export const orgSlice = createSlice({
  name: 'org',
  initialState,
  reducers: {
    setAdmins(state: State, action: PayloadAction<State['admins']>): void {
      state.admins = action.payload;
    },
    setMembers(state: State, action: PayloadAction<State['members']>): void {
      state.members = action.payload;
    }
  },
  extraReducers: (builder) => {
    addFetchCasesToReducer(
      builder,
      fetchAdmins,
      'admins',
      (state, action) => (state.admins = action.payload)
    );
    addFetchCasesToReducer(
      builder,
      fetchMembers,
      'members',
      (state, action) => (state.members = action.payload)
    );
    addFetchCasesToReducer(
      builder,
      updateMember,
      'members',
      (state, action) => {
        const memberId = action.payload.id;
        state.members[memberId].name = action.payload.name;
        state.members[memberId].primary_email = action.payload.primary_email;
        state.members[memberId].identities = {
          ...(state.members[memberId].identities || {}),
          [Integration.GITHUB]: { username: action.payload.github }
        };
      }
    );
    addFetchCasesToReducer(
      builder,
      deleteMember,
      'members',
      (state, action) =>
        (state.members[action.payload.id].is_deleted =
          action.payload.is_deleted)
    );
    addFetchCasesToReducer(
      builder,
      restoreMember,
      'members',
      (state, action) =>
        (state.members[action.payload.id].is_deleted =
          action.payload.is_deleted)
    );
    addFetchCasesToReducer(
      builder,
      getOrgAlertSettings,
      'syncAlertsAsIncidents',
      (state, action) => {
        state.syncAlertsAsIncidents =
          action.payload.should_sync_alerts_as_incidents;
      }
    );
    addFetchCasesToReducer(
      builder,
      getDefaultSyncDaysSettings,
      'defaultSyncDays',
      (state, action) => {
        state.defaultSyncDays = action.payload;
      }
    );
    addFetchCasesToReducer(
      builder,
      updateDefaultSyncDaysSettings,
      'defaultSyncDays',
      (state, action) => {
        state.defaultSyncDays = action.payload;
      }
    );
  }
});

export const fetchAdmins = createAsyncThunk(
  'org/fetchAdmins',
  async (params: { orgId: ID }) => {
    return await handleApi<BaseUser[]>(`/resources/orgs/${params.orgId}/pocs`, {
      params: { org_id: params.orgId }
    });
  }
);

export const fetchMembers = createAsyncThunk(
  'org/fetchMembers',
  async (params: { orgId: ID }) => {
    return await handleApi<Record<ID, User>>(
      `/resources/orgs/${params.orgId}/users_with_identities`
    );
  }
);

export const updateMember = createAsyncThunk(
  'org/updateMembers',
  async (params: {
    orgId: ID;
    memberUserId: ID;
    github: string;
    primary_email: string;
    name: string;
  }) => {
    const response = await handleApi<DBUserRow>(
      `/resources/orgs/${params.orgId}/users`,
      {
        params: {
          user_id: params.memberUserId,
          github: params.github,
          primary_email: params.primary_email,
          name: params.name
        },
        method: 'PATCH'
      }
    );

    return {
      id: response.id,
      github: params.github,
      name: response.name,
      primary_email: response.primary_email
    };
  }
);

export const deleteMember = createAsyncThunk(
  'org/deleteMember',
  async (params: { userId: ID; orgId: ID }) => {
    return await handleApi<DBUserRow>(`/resources/orgs/${params.orgId}/users`, {
      params: {
        user_id: params.userId
      },
      method: 'DELETE'
    });
  }
);

export const restoreMember = createAsyncThunk(
  'org/restoreMember',
  async (
    params: { name: string; orgId: ID; email: string },
    { rejectWithValue }
  ) => {
    return await handleApi<DBUserRow>(`/scenarios/add_new_user`, {
      data: {
        user: {
          name: params.name,
          org_id: params.orgId,
          primary_email: params.email
        }
      },
      method: 'POST'
    }).catch((err) => rejectWithValue(err));
  }
);

export const getOrgAlertSettings = createAsyncThunk(
  'org/orgAlertSettings',
  async (params: { userId: ID; orgId: ID }) => {
    return await handleApi<OrgAlertSettings>(
      `/internal/${params.orgId}/alerts_as_incidents`,
      {
        params: {
          user_id: params.userId
        }
      }
    );
  }
);

export const updatedOrgAlertSettings = createAsyncThunk(
  'org/orgAlertSettings',
  async (params: { userId: ID; orgId: ID; updatedSetting: boolean }) => {
    return await handleApi<OrgAlertSettings>(
      `/internal/${params.orgId}/alerts_as_incidents`,
      {
        data: {
          updated_setting: params.updatedSetting,
          user_id: params.userId
        },
        method: 'PUT'
      }
    );
  }
);

export const getDefaultSyncDaysSettings = createAsyncThunk(
  'org/getDefaultSyncDaysSettings',
  async (params: { orgId: ID }) => {
    return (await handleApi<OrgDefaultSyncDaysSettings>(
      `/internal/${params.orgId}/settings`,
      {
        params: {
          setting_type: 'DEFAULT_SYNC_DAYS_SETTING'
        }
      }
    )).default_sync_days;
  }
);

export const updateDefaultSyncDaysSettings = createAsyncThunk(
  'org/updateDefaultSyncDaysSettings',
  async (params: { orgId: ID; userId?: ID; defaultSyncDays: number }) => {
    return (await handleApi<OrgDefaultSyncDaysSettings>(
      `/internal/${params.orgId}/settings`,
      {
        data: {
          setting_type: 'DEFAULT_SYNC_DAYS_SETTING',
          setter_id: params.userId,
          setting_data: {
            default_sync_days: params.defaultSyncDays
          }
        },
        method: 'PUT'
      }
    )).default_sync_days;
  }
);
