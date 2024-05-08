import { splitEvery } from 'ramda';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  AppStates,
  LogEntry,
  LogSource,
  READY_MESSAGES
} from '../constants.js';
import { appSlice } from '../slices/app.js';
import { useDispatch, useSelector } from '../store/index.js';
import { getLineLimit } from '../utils/line-limit.js';
import { runCommand } from '../utils/run-command.js';

export const useLogs = (
  logSource: Omit<LogSource, LogSource.All>,
  addLogs: (entry: LogEntry) => any
) => {
  const lineLimit = getLineLimit();
  const dispatch = useDispatch();
  const appState = useSelector((state) => state.app.appState);
  const [started, setStarted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFile, prefix, color] = (() => {
    const def = ['web-server/web-server', 'web', '#70d6ff'] as const;
    switch (logSource) {
      case LogSource.WebServer:
        return def;
      case LogSource.ApiServer:
        return ['apiserver/apiserver', 'api', '#06d6a0'];
      case LogSource.Redis:
        return ['redis/redis', 'rdi', '#ef476f'];
      case LogSource.InitDb:
        return ['init_db/init_db', 'idb', '#118ab2'];
      case LogSource.Postgres:
        return ['postgres/postgres', 'pgs', '#ff70a6'];
      case LogSource.Cron:
        return ['cron/cron', 'cro', '#ffd166'];
      default:
        return def;
    }
  })();

  const updateLogs = useCallback(
    (line: string, type?: 'data' | 'error') => {
      const log: LogEntry = {
        time: new Date(),
        type: type === 'error' ? 'error' : 'data',
        color: color,
        prefix: prefix,
        line: line
      };

      addLogs(log);
      setLogs((logs) => logs.concat(log));
    },
    [addLogs, color, prefix]
  );

  const runCommandOpts = useMemo(() => {
    const handleLines = (line: string, type: 'data' | 'error' = 'data') => {
      const checkLogEquality = () => {
        // @ts-ignore
        const msgs = READY_MESSAGES[logSource];

        if (Array.isArray(msgs)) return msgs.some((msg) => line.includes(msg));
        return line.includes(msgs);
      };

      if (checkLogEquality())
        dispatch(appSlice.actions.updateReadyServices(logSource));

      line
        .split('\n')
        .flatMap((l) => splitEvery(lineLimit, l))
        .map((l) => updateLogs(l, type));
    };

    return {
      onData: (line: string) => handleLines(line),
      onErr: (line: string) => handleLines(line, 'error')
    };
  }, [dispatch, logSource, lineLimit, updateLogs]);

  useEffect(() => {
    if (appState !== AppStates.DOCKER_READY || started) return;

    setStarted(true);

    const attemptCommand = () => {
      return runCommand(
        'docker',
        [
          'exec',
          'middleware-dev',
          '/bin/bash',
          '-c',
          `tail -f /var/log/${logFile}.log`
        ],
        runCommandOpts
      );
    };

    attemptCommand().promise.catch(() => {
      // In case command wasn't successful the first time, try once more in 5 seconds
      // Ignore 2nd failure
      setTimeout(() => attemptCommand().promise.catch(() => {}), 5000);
    });
  }, [appState, logFile, runCommandOpts, started]);

  return logs;
};
