import { createSlice } from '@reduxjs/toolkit';
import { PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { FetchState } from '@/constants/ui-states';
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
  }
});

export const fetchCurrentOrg = createAsyncThunk(
  'auth/fetchCurrentOrg',
  async () => {
    const session = await handleApi<{ org: Org }>('/auth/session');
    return session.org;
  }
);
