import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { AppStates, LogEntry, LogSource } from '../constants.js';

type State = {
  logSource: LogSource;
  appState: AppStates;
  readyServices: Omit<LogSource, LogSource.All>[];
  logsStream: LogEntry[];
};

const initialState: State = {
  logSource: LogSource.All,
  appState: AppStates.PREREQ_CHECK,
  readyServices: [] as Omit<LogSource, LogSource.All>[],
  logsStream: [
    {
      type: 'intro',
      line: '',
      time: new Date()
    }
  ]
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setLogSource(state: State, action: PayloadAction<LogSource>): void {
      state.logSource = action.payload;
    },
    setAppState(state: State, action: PayloadAction<AppStates>): void {
      state.appState = action.payload;
    },
    updateReadyServices(
      state: State,
      action: PayloadAction<Omit<LogSource, LogSource.All>>
    ): void {
      const unqServices = new Set(state.readyServices);
      unqServices.add(action.payload);
      state.readyServices = Array.from(unqServices);
    },
    setLogsStream(state: State, action: PayloadAction<LogEntry[]>): void {
      state.logsStream = action.payload;
    },
    addLog(state: State, action: PayloadAction<LogEntry>): void {
      state.logsStream = state.logsStream.concat(action.payload);
    }
  },
  extraReducers: (_builder) => {}
});
