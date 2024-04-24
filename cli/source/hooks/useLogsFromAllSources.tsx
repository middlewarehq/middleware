import { Newline, Text } from 'ink';
import { ReactNode, useCallback, useEffect, useState } from 'react';

import { useAppContext } from './useAppContext.js';
import { useLogs } from './useLogs.js';
import { usePrevious } from './usePrevious.js';

import {
  AppStates,
  LogEntry,
  LogSource,
  keysForLogSource
} from '../constants.js';

const HIST_LIMIT = 5000;

export const useLogsFromAllSources = () => {
  const { appState, logsStream, setLogsStream, logSource, addLog } =
    useAppContext();

  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const addLogs = useCallback(
    (entry: LogEntry, src: LogSource) => {
      setAllLogs((logs) => logs.concat(entry));

      if (src === logSource) addLog(entry.line);
    },
    [addLog, logSource]
  );

  const webLogs = useLogs(LogSource.WebServer, (entry) =>
    addLogs(entry, LogSource.WebServer)
  );
  const apiLogs = useLogs(LogSource.ApiServer, (entry) =>
    addLogs(entry, LogSource.ApiServer)
  );
  const redisLogs = useLogs(LogSource.Redis, (entry) =>
    addLogs(entry, LogSource.Redis)
  );
  const initDbLogs = useLogs(LogSource.InitDb, (entry) =>
    addLogs(entry, LogSource.InitDb)
  );
  const pgLogs = useLogs(LogSource.Postgres, (entry) =>
    addLogs(entry, LogSource.Postgres)
  );
  const cronLogs = useLogs(LogSource.Cron, (entry) =>
    addLogs(entry, LogSource.Cron)
  );

  const prevLogSource = usePrevious(logSource);

  useEffect(() => {
    if (appState !== AppStates.DOCKER_READY || prevLogSource === logSource)
      return;

    const newLogs: ReactNode[] = [];

    switch (logSource) {
      case LogSource.WebServer:
        newLogs.push(...webLogs.slice(-HIST_LIMIT).map((log) => log.line));
        break;
      case LogSource.ApiServer:
        newLogs.push(...apiLogs.slice(-HIST_LIMIT).map((log) => log.line));
        break;
      case LogSource.Postgres:
        newLogs.push(...pgLogs.slice(-HIST_LIMIT).map((log) => log.line));
        break;
      case LogSource.InitDb:
        newLogs.push(...initDbLogs.slice(-HIST_LIMIT).map((log) => log.line));
        break;
      case LogSource.Redis:
        newLogs.push(...redisLogs.slice(-HIST_LIMIT).map((log) => log.line));
        break;
      case LogSource.Cron:
        newLogs.push(...cronLogs.slice(-HIST_LIMIT).map((log) => log.line));
        break;
      case LogSource.All:
      default:
        newLogs.push(...allLogs.slice(-HIST_LIMIT).map((log) => log.line));
        break;
    }

    newLogs.length &&
      newLogs.splice(
        0,
        0,
        <Text bold color="green" key={-Infinity}>
          <Newline count={2} />
          Showing logs from{' '}
          <Text bold color="green">
            {keysForLogSource[logSource]}
          </Text>
          {' 👇'}
          <Newline />
        </Text>
      );

    newLogs.push(
      <Text bold color="green" key={-Infinity}>
        <Newline />
        Continuing logs from{' '}
        <Text bold color="green">
          {keysForLogSource[logSource]}
        </Text>
        {' ↕️'}
        <Newline count={1} />
      </Text>
    );

    setLogsStream((logs) => logs.concat(newLogs));
  }, [
    allLogs,
    apiLogs,
    appState,
    cronLogs,
    initDbLogs,
    logSource,
    logsStream,
    pgLogs,
    prevLogSource,
    redisLogs,
    setLogsStream,
    webLogs
  ]);
};
