import { Text } from 'ink';
import { splitEvery } from 'ramda';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAppContext } from './useAppContext.js';

import {
  AppStates,
  LogEntry,
  LogSource,
  READY_MESSAGES
} from '../constants.js';
import { getLineLimit } from '../utils/line-limit.js';
import { runCommand } from '../utils/run-command.js';

export const useLogs = (
  logSource: Omit<LogSource, LogSource.All>,
  addLogs: (entry: LogEntry) => any
) => {
  const lineLimit = getLineLimit();
  const { appState, updateReadyServices } = useAppContext();
  const [started, setStarted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFile, prefix, color] = (() => {
    const def = ['webserver/webserver', 'web', '#70d6ff'] as const;
    switch (logSource) {
      case LogSource.WebServer:
        return def;
      case LogSource.ApiServer:
        return ['apiserver/apiserver', 'api', '#06d6a0'];
      case LogSource.Redis:
        return ['redis/redis', 'rds', '#ef476f'];
      case LogSource.InitDb:
        return ['init_db/init_db', 'ind', '#118ab2'];
      case LogSource.Postgres:
        return ['postgres/postgres', 'pgs', '#ff70a6'];
      case LogSource.Cron:
        return ['cron', 'cro', '#ffd166'];
      default:
        return def;
    }
  })();

  const updateLogs = useCallback(
    (line: string, type?: 'data' | 'error') => {
      const log: LogEntry = {
        time: new Date(),
        line:
          type === 'error' ? (
            <Text color="redBright">
              <Text bold color={color} inverse>
                {prefix}
              </Text>
              {' ❗️ '}
              {line}
            </Text>
          ) : (
            <Text>
              <Text bold color={color} inverse>
                {prefix}
              </Text>{' '}
              {line}
            </Text>
          )
      };

      addLogs(log);
      setLogs((logs) => logs.concat(log));
    },
    [addLogs, color, prefix]
  );

  const runCommandOpts = useMemo(
    () => ({
      onData: (line: string) => {
        // @ts-ignore
        if (line.includes(READY_MESSAGES[logSource]))
          updateReadyServices(logSource);
        line
          .split('\n')
          .flatMap((l) => splitEvery(lineLimit, l))
          .map((l) => updateLogs(l));
      },
      onErr: (line: string) => {
        // @ts-ignore
        if (line.includes(READY_MESSAGES[logSource]))
          updateReadyServices(logSource);

        line
          .split('\n')
          .flatMap((l) => splitEvery(lineLimit, l))
          .map((l) => updateLogs(l, 'error'));
      }
    }),
    [logSource, updateReadyServices, lineLimit, updateLogs]
  );
  useEffect(() => {
    if (appState !== AppStates.DOCKER_READY || started) return;

    setStarted(true);

    const attemptCommand = () => {
      return runCommand(
        'docker',
        [
          'exec',
          'dora-metrics',
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
