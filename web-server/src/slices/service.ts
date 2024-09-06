import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { ServiceNames } from '@/constants/service';

type Status = {
  isUp: boolean;
};

type Service = {
  isUp: boolean;
  logs: string[];
};

export type ServiceStatusState = {
  [key in ServiceNames]: Service;
};

type State = {
  services: ServiceStatusState;
  loading: boolean;
  error?: string;
};

const initialState: State = {
  services: {
    [ServiceNames.API_SERVER]: { isUp: false, logs: [] },
    [ServiceNames.REDIS]: { isUp: false, logs: [] },
    [ServiceNames.POSTGRES]: { isUp: false, logs: [] },
    [ServiceNames.SYNC_SERVER]: { isUp: false, logs: [] }
  },
  loading: true,
  error: undefined
};

type SetStatusPayload = {
  statuses: { [key in ServiceNames]: Status };
};

export const serviceSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setStatus: (state, action: PayloadAction<SetStatusPayload>) => {
      state.loading = false;
      const { statuses } = action.payload;

      for (const [serviceName, { isUp }] of Object.entries(statuses)) {
        if (state.services[serviceName as ServiceNames]) {
          state.services[serviceName as ServiceNames].isUp = isUp;
        }
      }
    },
    setServiceLogs: (
      state,
      action: PayloadAction<{ serviceName: ServiceNames; serviceLog: string[] }>
    ) => {
      state.loading = false;
      const { serviceName, serviceLog } = action.payload;
      state.services[serviceName].logs = [
        ...state.services[serviceName].logs,
        ...serviceLog
      ];
    },
    resetState: () => initialState
  }
});

export default serviceSlice.reducer;
