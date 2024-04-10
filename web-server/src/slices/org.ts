import { createSlice } from '@reduxjs/toolkit';
import { PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { Integration } from '@/constants/integrations';
import { StateFetchConfig } from '@/types/redux';
import { BaseUser, DBUserRow, OrgSettings } from '@/types/resources';
import { addFetchCasesToReducer } from '@/utils/redux';

type State = StateFetchConfig<{
  admins: BaseUser[];
  members: Record<ID, User>;
  syncAlertsAsIncidents: boolean;
}>;

const initialState: State = {
  admins: [],
  members: {},
  syncAlertsAsIncidents: false
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
  'org/orgSettings',
  async (params: { userId: ID; orgId: ID }) => {
    return await handleApi<OrgSettings>(
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
  'org/orgSettings',
  async (params: { userId: ID; orgId: ID; updatedSetting: boolean }) => {
    return await handleApi<OrgSettings>(
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
