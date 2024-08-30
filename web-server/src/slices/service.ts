import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { ServiceNames } from '@/constants/service';
import { StateFetchConfig } from '@/types/redux';

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
  active: string | null;
}>;

export type serviceSliceState = State;

const getInitialState = (): State => {
  return {
    services: {
      [ServiceNames.API_SERVER]: { isUp: false, logs: [] },
      [ServiceNames.REDIS]: { isUp: false, logs: [] },
      [ServiceNames.POSTGRES]: { isUp: false, logs: [] },
      [ServiceNames.SYNC_SERVER]: { isUp: false, logs: [] }
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
      state.active = action.payload;
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
