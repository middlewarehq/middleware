import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext
} from 'react';

import { AppStates, LogSource } from '../constants.js';

const AppContext = createContext({
  appState: AppStates.INIT,
  setAppState: (() => {}) as Dispatch<SetStateAction<AppStates>>,
  logsStream: [] as ReactNode[],
  setLogsStream: (() => {}) as Dispatch<SetStateAction<ReactNode[]>>,
  logSource: LogSource.All,
  setLogSource: (() => {}) as Dispatch<SetStateAction<LogSource>>,
  addLog: (_nodes: ReactNode | ReactNode[]) => {},
  readyServices: new Set<Omit<LogSource, LogSource.All>>(),
  updateReadyServices: (_svcs: Omit<LogSource, LogSource.All>) => {}
});

export const AppContextProvider = AppContext.Provider;

export const useAppContext = () => useContext(AppContext);
