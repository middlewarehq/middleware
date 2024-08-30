import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { StateFetchConfig } from '@/types/redux';

export enum ServiceNames {
  API_SERVER = 'api-server-service',
  REDIS = 'redis-service',
  POSTGRES = 'postgres-service',
  SYNC_SERVER = 'sync-server-service'
}

type ServiceStatus = {
  isUp: boolean;
  logs: string[];
};

export type ServiceStatusState = {
  [key in ServiceNames]: ServiceStatus;
} & { [key: string]: ServiceStatus };

type State = StateFetchConfig<{
  services: ServiceStatusState;
  loading?: boolean;
  error?: string;
  active: string | null; // Add 'active' to store the active service name
}>;

export type serviceSliceState = State;

const getInitialState = (): State => {
  return {
    services: {
      'api-server-service': { isUp: false, logs: [] },
      'redis-service': { isUp: false, logs: [] },
      'postgres-service': { isUp: false, logs: [] },
      'sync-server-service': { isUp: false, logs: [] }
    },
    active: null,
    loading: false,
    error: undefined
  };
};

const initialState: State = getInitialState();

export const fetchServiceStatus = createAsyncThunk(
  'services/fetchServiceStatus',
  async () => {
    const response = await handleApi<{
      statuses: { [key in ServiceNames]: { isUp: boolean } };
    }>('/service/status', {
      params: {}
    });
    return {
      statuses: response.statuses
    };
  }
);

export const fetchServiceLogs = createAsyncThunk(
  'services/fetchServiceLogs',
  async (serviceName: string) => {
    const response = await handleApi<{ logs: string[] }>('/service/log', {
      params: { serviceName }
    });
    return { serviceName, logs: response.logs };
  }
);

export const serviceSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    setActiveService: (state, action) => {
      console.log(action.payload, 'payload', typeof action.payload);
      state.active = action.payload;
      console.log(state.active, 'active');
    },
    resetState: () => getInitialState()
  },
  extraReducers: (builder) => {
    builder.addCase(fetchServiceStatus.fulfilled, (state, action) => {
      state.loading = false;
      const { statuses } = action.payload;
      for (const [serviceName, { isUp }] of Object.entries(statuses)) {
        state.services[serviceName].isUp = isUp;
      }
    });

    builder.addCase(fetchServiceLogs.fulfilled, (state, action) => {
      state.loading = false;
      const { serviceName, logs } = action.payload;
      state.services[serviceName].logs = logs;
    });
  }
});

export default serviceSlice.reducer;
