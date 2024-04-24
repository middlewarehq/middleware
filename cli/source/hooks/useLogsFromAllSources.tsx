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

export const useLogsFromAllSources = () => {
  const { appState, logsStream, setLogsStream, logSource, addLog } =
    useAppContext();

  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const addLogs = useCallback(
    (entry: LogEntry) => {
      setAllLogs((logs) => logs.concat(entry));
      addLog(entry.line);
    },
    [addLog]
  );

  const webLogs = useLogs(LogSource.WebServer, addLogs);
  const apiLogs = useLogs(LogSource.ApiServer, addLogs);
  const redisLogs = useLogs(LogSource.Redis, addLogs);
  const initDbLogs = useLogs(LogSource.InitDb, addLogs);
  const pgLogs = useLogs(LogSource.Postgres, addLogs);
  const cronLogs = useLogs(LogSource.Cron, addLogs);

  const prevLogSource = usePrevious(logSource);

  useEffect(() => {
    if (appState !== AppStates.DOCKER_READY || prevLogSource === logSource)
      return;

    const newLogs: ReactNode[] = [];

    switch (logSource) {
      case LogSource.WebServer:
        newLogs.push(...webLogs.slice(-10000).map((log) => log.line));
        break;
      case LogSource.ApiServer:
        newLogs.push(...apiLogs.slice(-10000).map((log) => log.line));
        break;
      case LogSource.Postgres:
        newLogs.push(...pgLogs.slice(-10000).map((log) => log.line));
        break;
      case LogSource.InitDb:
        newLogs.push(...initDbLogs.slice(-10000).map((log) => log.line));
        break;
      case LogSource.Redis:
        newLogs.push(...redisLogs.slice(-10000).map((log) => log.line));
        break;
      case LogSource.Cron:
        newLogs.push(...cronLogs.slice(-10000).map((log) => log.line));
        break;
      case LogSource.All:
      default:
        newLogs.push(...allLogs.slice(-10000).map((log) => log.line));
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
