import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { ServiceNames } from '@/constants/service';

type Status = {
  isUp: boolean;
};

type Service = {
  isUp: boolean;
  logs: string[];
};

export type ServiceStatusState = Record<ServiceNames, Service>;

type State = {
  services: ServiceStatusState;
  loading: boolean;
};

const initialState: State = {
  services: {
    [ServiceNames.API_SERVER]: { isUp: false, logs: [] },
    [ServiceNames.REDIS]: { isUp: false, logs: [] },
    [ServiceNames.POSTGRES]: { isUp: false, logs: [] },
    [ServiceNames.SYNC_SERVER]: { isUp: false, logs: [] }
  },
  loading: true
};

type SetStatusPayload = {
  statuses: Record<ServiceNames, Status>;
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

      Object.entries(statuses).forEach(([serviceName, { isUp }]) => {
        const service = state.services[serviceName as ServiceNames];
        if (service) {
          service.isUp = isUp;
        }
      });
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
