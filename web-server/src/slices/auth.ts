import { createSlice } from '@reduxjs/toolkit';
import { PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { FetchState } from '@/constants/ui-states';
import { OnboardingStep } from '@/types/resources';
import { addFetchCasesToReducer } from '@/utils/redux';

export interface State {
  isInitialized: boolean;
  isAuthenticated: boolean;
  org: Org | null;
  requests: Partial<
    Record<keyof Omit<State, 'requests' | 'errors'>, FetchState>
  >;
  errors: Partial<Record<keyof State['requests'], any>>;
}

export const initialState: State = {
  isInitialized: false,
  isAuthenticated: false,
  org: null,
  requests: {
    org: FetchState.DORMANT
  },
  errors: {}
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    init(state: State, action: PayloadAction<Partial<State>>): void {
      const { isAuthenticated, org } = action.payload;
      state.isAuthenticated = isAuthenticated;
      state.isInitialized = true;
      state.org = org;
    }
  },
  extraReducers: (builder) => {
    addFetchCasesToReducer(
      builder,
      fetchCurrentOrg,
      'org',
      (state, action: PayloadAction<Org>) => {
        state.org = action.payload;
      }
    );
    addFetchCasesToReducer(
      builder,
      updateOnboardingState,
      'org',
      (
        state,
        action: PayloadAction<{ onboarding_state: OnboardingStep[] }>
      ) => {
        if (state.org) {
          state.org.onboarding_state = action.payload.onboarding_state;
        }
      }
    );
    addFetchCasesToReducer(
      builder,
      fetchIntegrationsMap,
      'org',
      (state, action: PayloadAction<Partial<IntegrationsMap>>) => {
        if (state.org) {
          state.org.integrations = action.payload;
        }
      }
    );
  }
});

export const fetchCurrentOrg = createAsyncThunk(
  'auth/fetchCurrentOrg',
  async () => {
    const session = await handleApi<{ org: Org }>('/auth/session');
    return session.org;
  }
);

export const updateOnboardingState = createAsyncThunk(
  'auth/updateOnboardingState',
  async (params: { org_id: ID; onboardingState: OnboardingStep[] }) => {
    return handleApi<{ onboarding_state: OnboardingStep[] }>(
      `/resources/orgs/${params.org_id}/onboarding`,
      {
        method: 'PUT',
        data: {
          onboarding_state: params.onboardingState
        }
      }
    );
  }
);

export const fetchIntegrationsMap = createAsyncThunk(
  'auth/fetchIntegrationsMap',
  async () => {
    return handleApi<Partial<IntegrationsMap>>(
      '/integrations/integrations-map'
    );
  }
);
