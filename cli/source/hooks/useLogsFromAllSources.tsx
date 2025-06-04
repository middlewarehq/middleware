import { Box, Newline, Text } from 'ink';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLogs } from './useLogs.js';

import {
  AppStates,
  LogEntry,
  LogSource,
  keysForLogSource,
  logoText
} from '../constants.js';
import { appSlice } from '../slices/app.js';
import { useDispatch, useSelector } from '../store/index.js';

const HIST_LIMIT = 5000;

export const useLogsFromAllSources = () => {
  const dispatch = useDispatch();
  const appState = useSelector((state) => state.app.appState);
  const logSource = useSelector((state) => state.app.logSource);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const logSourceRef = useRef(logSource);
  logSourceRef.current = logSource;

  const addLogs = useCallback(
    (src: LogSource) => (entry: LogEntry) => {
      /** addLogs is meant to be invoked only from individual sources */
      if (logSourceRef.current === LogSource.All) {
        dispatch(appSlice.actions.addLog(entry));
        return;
      }

      setAllLogs((logs) => logs.concat(entry));
      if (src === logSourceRef.current)
        dispatch(appSlice.actions.addLog(entry));
    },
    [dispatch]
  );

  const webLogs = useLogs(LogSource.WebServer, addLogs(LogSource.WebServer));
  const apiLogs = useLogs(LogSource.ApiServer, addLogs(LogSource.ApiServer));
  const syncLogs = useLogs(LogSource.SyncServer, addLogs(LogSource.SyncServer));
  const redisLogs = useLogs(LogSource.Redis, addLogs(LogSource.Redis));
  const initDbLogs = useLogs(LogSource.InitDb, addLogs(LogSource.InitDb));
  const pgLogs = useLogs(LogSource.Postgres, addLogs(LogSource.Postgres));
  const cronLogs = useLogs(LogSource.Cron, addLogs(LogSource.Cron));
  const queueLogs = useLogs(LogSource.Queue, addLogs(LogSource.Queue));

  const webLogsRef = useRef(webLogs);
  const apiLogsRef = useRef(apiLogs);
  const syncLogsRef = useRef(syncLogs);
  const redisLogsRef = useRef(redisLogs);
  const initDbLogsRef = useRef(initDbLogs);
  const pgLogsRef = useRef(pgLogs);
  const cronLogsRef = useRef(cronLogs);
  const queueLogsRef = useRef(queueLogs);
  const allLogsRef = useRef(allLogs);

  webLogsRef.current = webLogs;
  apiLogsRef.current = apiLogs;
  syncLogsRef.current = syncLogs;
  redisLogsRef.current = redisLogs;
  initDbLogsRef.current = initDbLogs;
  pgLogsRef.current = pgLogs;
  cronLogsRef.current = cronLogs;
  queueLogsRef.current = queueLogs;
  allLogsRef.current = allLogs;

  useEffect(() => {
    if (appState !== AppStates.DOCKER_READY) return;
    const newLogs: LogEntry[] = [];

    switch (logSource) {
      case LogSource.WebServer:
        newLogs.push(...webLogsRef.current.slice(-HIST_LIMIT));
        break;
      case LogSource.ApiServer:
        newLogs.push(...apiLogsRef.current.slice(-HIST_LIMIT));
        break;
      case LogSource.SyncServer:
        newLogs.push(...syncLogsRef.current.slice(-HIST_LIMIT));
        break;
      case LogSource.Postgres:
        newLogs.push(...pgLogsRef.current.slice(-HIST_LIMIT));
        break;
      case LogSource.InitDb:
        newLogs.push(...initDbLogsRef.current.slice(-HIST_LIMIT));
        break;
      case LogSource.Redis:
        newLogs.push(...redisLogsRef.current.slice(-HIST_LIMIT));
        break;
      case LogSource.Cron:
        newLogs.push(...cronLogsRef.current.slice(-HIST_LIMIT));
        break;
      case LogSource.Queue:
        newLogs.push(...queueLogsRef.current.slice(-HIST_LIMIT));
        break;
      case LogSource.All:
      default:
        newLogs.push(...allLogsRef.current.slice(-HIST_LIMIT));
        break;
    }

    newLogs.length &&
      newLogs.splice(0, 0, {
        type: 'continuing-logs',
        line: keysForLogSource[logSource],
        time: new Date()
      });

    newLogs.push({
      type: 'showing-logs',
      line: keysForLogSource[logSource],
      time: new Date()
    });
    dispatch(appSlice.actions.setLogsStream(newLogs));
  }, [appState, dispatch, logSource]);
};

export const transformLogToNode = (log: LogEntry) => {
  const logType = log.type;
  switch (logType) {
    case 'showing-logs':
      return (
        <Text bold color="green" key={-Infinity}>
          <Newline />
          Continuing logs from{' '}
          <Text bold color="green">
            {log.line}
          </Text>
          {' ↕️'}
          <Newline count={1} />
        </Text>
      );
    case 'continuing-logs':
      return (
        <Text bold color="green" key={-Infinity}>
          <Newline />
          Showing logs from{' '}
          <Text bold color="green">
            {log.line}
          </Text>
          {' 👇'}
          <Newline />
        </Text>
      );
    case 'data':
      return (
        <Text>
          <Text bold color={log.color} inverse>
            {log.prefix}
          </Text>{' '}
          {log.line}
        </Text>
      );
    case 'error':
      return (
        <Text color="redBright">
          <Text bold color={log.color} inverse>
            {log.prefix}
          </Text>
          {' ❗️ '}
          {log.line}
        </Text>
      );
    case 'run-command-on-data':
      return (
        <Text>
          <Text color="yellow" bold inverse>
            CNTNR
          </Text>{' '}
          {log.line}
        </Text>
      );
    case 'run-command-error':
      return (
        <Text color="red">
          <Text color="red" bold inverse>
            CNTNR
          </Text>{' '}
          {log.line}
        </Text>
      );
    case 'intro':
      return (
        <>
          <Box
            borderStyle="double"
            borderColor="#7e57c2"
            key={0}
            flexDirection="column"
          >
            <Text color="#7e57c2">{logoText}</Text>
            <Text bold>Open Source</Text>
          </Box>
          <Newline key={2} />
        </>
      );
    default:
      return <Text>{log.line}</Text>;
  }
};
