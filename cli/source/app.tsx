import { Box, Newline, Static, Text, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { splitEvery } from 'ramda';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Provider as ReduxProvider } from 'react-redux';

import { ChildProcessWithoutNullStreams } from 'child_process';

import {
  AppStates,
  ErrorCodes,
  LogSource,
  PreCheckProperties,
  PreCheckStates,
  READY_MESSAGES,
  terminatedText
} from './constants.js';
import {
  useLogsFromAllSources,
  transformLogToNode
} from './hooks/useLogsFromAllSources.js';
import { usePreCheck } from './hooks/usePreCheck.js';
import { appSlice } from './slices/app.js';
import { useSelector, store, useDispatch } from './store/index.js';
import CircularBuffer from './utils/circularBuffer.js';
import { getLineLimit } from './utils/line-limit.js';
import { runCommand } from './utils/run-command.js';
import { isLocalBranchBehindRemote } from './utils/update-checker.js';

const CliUi = () => {
  const dispatch = useDispatch();

  const logSource = useSelector((state) => state.app.logSource);
  const logsStream = useSelector((state) => state.app.logsStream);
  const readyServices = useSelector((state) => state.app.readyServices);
  const appState = useSelector((state) => state.app.appState);
  useLogsFromAllSources();

  const [retryToggle, setRetryToggle] = useState<Boolean>(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<string>('');

  const { exit } = useApp();

  const lineLimit = getLineLimit();

  const processRef = useRef<ChildProcessWithoutNullStreams | null>();

  const frontend_port = process.env['PORT'];
  const sync_server_port = process.env['SYNC_SERVER_PORT'];
  const analytics_server_port = process.env['ANALYTICS_SERVER_PORT'];
  const db_port = process.env['DB_PORT'];
  const db_host = process.env['DB_HOST'];
  const db_name = process.env['DB_NAME'];
  const db_user = process.env['DB_USER'];
  const db_pass = process.env['DB_PASS'];
  const redis_port = process.env['REDIS_PORT'];
  const redis_host = process.env['REDIS_HOST'];

  const preCheck = usePreCheck({
    db: Number(db_port),
    redis: Number(redis_port),
    frontend: Number(frontend_port),
    sync_server: Number(sync_server_port),
    analytics_server: Number(analytics_server_port)
  });

  const runCommandOpts = useMemo<Parameters<typeof runCommand>['2']>(
    () => ({
      onData: (line) =>
        line
          .split('\n')
          .flatMap((l) => splitEvery(lineLimit, l))
          .map((l) =>
            dispatch(
              appSlice.actions.addLog({
                type: 'run-command-on-data',
                line: l,
                time: new Date()
              })
            )
          ),
      onErr: (line) =>
        line
          .split('\n')
          .flatMap((l) => splitEvery(lineLimit, l))
          .map((l) =>
            dispatch(
              appSlice.actions.addLog({
                type: 'run-command-error',
                line: l,
                time: new Date()
              })
            )
          ),
      log_buffer: new CircularBuffer<string>(10),
      options: {
        env: process.env
      }
    }),

    [dispatch, lineLimit]
  );

  const handleExit = useCallback(async () => {
    if (appState === AppStates.PREREQ_CHECK) {
      exit();
    }
    await dispatch(appSlice.actions.setAppState(AppStates.TEARDOWN));
    setTimeout(() => {
      if (!processRef.current) return;

      processRef.current.kill();
      processRef.current.stdout.destroy();
      processRef.current.stderr.destroy();
      runCommand('docker', ['compose', 'down'], runCommandOpts)
        .promise.catch(async (err: any) => {
          await runCommand('docker-compose', ['down']).promise;
        })
        .finally(async () => {
          await dispatch(appSlice.actions.setAppState(AppStates.TERMINATED));
        });

    }, 200);
  }, [appState, dispatch, runCommandOpts]);

  const handleVersionUpdates = useCallback(async () => {
    await isLocalBranchBehindRemote().then((res) => {
      setIsUpdateAvailable(res);
    });
  }, [setIsUpdateAvailable]);

  useEffect(() => {
    if (appState !== AppStates.TERMINATED) return;
    process.exit(0);
  }, [appState, exit]);

  useInput((input) => {
    const lowerCaseInput = input.toLowerCase();

    if (appState === AppStates.DOCKER_READY) {
      dispatch(appSlice.actions.setLogsStream([]));
      if (lowerCaseInput === 'q') {
        dispatch(appSlice.actions.setLogSource(LogSource.WebServer));
      } else if (lowerCaseInput === 'w') {
        dispatch(appSlice.actions.setLogSource(LogSource.ApiServer));
      } else if (lowerCaseInput === 'e') {
        dispatch(appSlice.actions.setLogSource(LogSource.Redis));
      } else if (lowerCaseInput === 'r') {
        dispatch(appSlice.actions.setLogSource(LogSource.Postgres));
      } else if (lowerCaseInput === 't') {
        dispatch(appSlice.actions.setLogSource(LogSource.InitDb));
      } else if (lowerCaseInput === 'a') {
        dispatch(appSlice.actions.setLogSource(LogSource.All));
      } else if (lowerCaseInput === 's') {
        dispatch(appSlice.actions.setLogSource(LogSource.SyncServer));
      }
    }

    if (lowerCaseInput === 'x') {
      handleExit();
    }
  });

  useEffect(() => {
    handleVersionUpdates();
  }, [handleVersionUpdates]);

  useEffect(() => {
    if (Object.values(preCheck).includes(PreCheckStates.RUNNING)) {
      return;
    } else {
      if (Object.values(preCheck).includes(PreCheckStates.FAILED)) {
        handleExit();
        return;
      }
    }

    dispatch(appSlice.actions.setAppState(AppStates.INIT));
    runCommand('docker', ['compose', 'down'], runCommandOpts)
      .promise.then(() => {
        const { process, promise } = runCommand(
          'docker',
          ['compose', 'build'],
          runCommandOpts
        );

        processRef.current = process;

        promise.catch((err) => {
          handleExit();
          dispatch(
            appSlice.actions.addLog({
              type: 'default',
              line: `docker compose build failed: ${err}`,
              time: new Date()
            })
          );
        });
      })
      .catch(async (err: any) => {
        await runCommand('docker-compose', ['down']).promise;
      });
  }, [
    preCheck.daemon,
    preCheck.ports,
    preCheck.dockerFile,
    preCheck.composeFile
  ]);

  useEffect(() => {
    if (appState !== AppStates.INIT) {
      return;
    }
    const { process, promise } = runCommand(
      'docker',
      ['compose', 'watch'],
      runCommandOpts
    );

    promise.catch((err) => {
      if (err.errno == ErrorCodes.SpawnProcessCommandNotFound) {
        const { process, promise } = runCommand(
          'docker-compose',
          ['watch'],
          runCommandOpts
        );

        promise.catch((err) => {
          handleExit();
          dispatch(
            appSlice.actions.addLog({
              type: 'default',
              line: `docker watch failed: ${err}`,
              time: new Date()
            })
          );
        });

        processRef.current = process;
        process?.stdout.on('data', lineListener);
        process?.stderr.on('data', lineListener);
      } else {
        handleExit();
        dispatch(
          appSlice.actions.addLog({
            type: 'default',
            line: `docker watch failed: ${err}`,
            time: new Date()
          })
        );
      }
    });

    processRef.current = process;
    const lineListener = async (data: Buffer) => {
      let watch_logs = String(data);

      if (
        READY_MESSAGES[LogSource.DockerWatch].some((rdyMsg) =>
          watch_logs.includes(rdyMsg)
        )
      ) {
        await dispatch(
          appSlice.actions.addLog({
            type: 'default',
            line: '🚀 Container ready 🚀',
            time: new Date()
          })
        );
        await dispatch(appSlice.actions.setAppState(AppStates.DOCKER_READY));
      }

      if (
        READY_MESSAGES[LogSource.DockerWatchProcessIdLock].some((lock_msg) =>
          watch_logs.includes(lock_msg)
        )
      ) {
        const pattern = /PID (\d+)/;
        const match = watch_logs.match(pattern);
        if (match) {
          const pid = match[1];
          dispatch(
            appSlice.actions.addLog({
              type: 'default',
              line: `Killing Process ${pid}`,
              time: new Date()
            })
          );

          const { process, promise } = runCommand(
            'kill',
            ['-9', pid!],
            runCommandOpts
          );
          await promise;
          setRetryToggle(true);
        }
      }
    };

    process?.stdout.on('data', lineListener);
    process?.stderr.on('data', lineListener);

    globalThis.process.on('exit', handleExit);
    return () => {
      globalThis.process.off('exit', handleExit);
    };
  }, [dispatch, exit, handleExit, runCommandOpts, retryToggle, appState]);

  useEffect(() => {
    preCheck.callDaemonCheck();
    preCheck.callPortsCheck();
    preCheck.callFilesCheck();
  }, []);

  const logsStreamNodes = useMemo(
    () => logsStream.map((l) => transformLogToNode(l)),
    [logsStream]
  );

  const PreCheckDisplayElement = ({
    value,
    property,
    errHelp
  }: {
    value: PreCheckStates;
    property: PreCheckProperties;
    errHelp: String;
  }) => {
    return (
      <>
        <Text>
          {value === PreCheckStates.RUNNING ? (
            <Spinner type="dots" />
          ) : value === PreCheckStates.SUCCESS ? (
            <Text color="green">✓</Text>
          ) : (
            <Text color="red">x</Text>
          )}{' '}
          Checking {property}
        </Text>
        {value === PreCheckStates.FAILED ? (
          <Text color="redBright">{errHelp}</Text>
        ) : (
          ''
        )}
      </>
    );
  };

  const preCheckFailed: boolean = useMemo(
    () =>
      !Object.values(preCheck).includes(PreCheckStates.RUNNING) &&
      Object.values(preCheck).includes(PreCheckStates.FAILED),
    [preCheck]
  );

  return (
    <>
      <Static items={logsStreamNodes} style={{ flexDirection: 'column' }}>
        {(log, i) => (
          <Box key={i}>
            {typeof log === 'string' ? <Text>{log}</Text> : log}
          </Box>
        )}
      </Static>
      <Box
        width="100%"
        height="100%"
        borderStyle={appState !== AppStates.TERMINATED ? 'double' : undefined}
        borderColor="#7e57c2"
        gap={2}
      >
        <Box>
          {(() => {
            switch (appState) {
              case AppStates.PREREQ_CHECK:
                return (
                  <Box flexDirection="column">
                    <Text color={preCheckFailed ? 'red' : 'blue'}>
                      {preCheckFailed
                        ? 'Status: Preqrequisites check has failed '
                        : 'Status: Running prerequisites check... [Press X to abort] '}
                      <Text
                        bold
                        color={
                          Object.values(preCheck).includes(
                            PreCheckStates.RUNNING
                          )
                            ? 'yellow'
                            : Object.values(preCheck).includes(
                              PreCheckStates.FAILED
                            )
                              ? 'red'
                              : 'green'
                        }
                      >
                        <Spinner type="material" />
                      </Text>
                    </Text>
                    <PreCheckDisplayElement
                      value={preCheck.daemon}
                      property={PreCheckProperties.DAEMON}
                      errHelp={
                        'Docker daemon is not running, please ensure it is running. To check if your docker daemon is running, use the command: \ndocker info'
                      }
                    />
                    <PreCheckDisplayElement
                      value={preCheck.ports}
                      property={PreCheckProperties.PORTS}
                      errHelp={
                        'One of the ports is not free. Please ensure that all the specified ports in dockerfile.dev are free.'
                      }
                    />
                    <PreCheckDisplayElement
                      value={preCheck.composeFile}
                      property={PreCheckProperties.COMPOSE_FILE}
                      errHelp={
                        'docker-compose.yml not found in the root directory. Please ensure that the file exists with the given name.'
                      }
                    />
                    <PreCheckDisplayElement
                      value={preCheck.dockerFile}
                      property={PreCheckProperties.DOCKER_FILE}
                      errHelp={
                        'Dockerfile.dev not found in the root directory. Please ensure that the file exists with the given name.'
                      }
                    />
                  </Box>
                );
              case AppStates.INIT:
                return (
                  <Box flexDirection="column">
                    <Text color="blue">
                      Status: Preparing docker container... [Press X to abort]{' '}
                      <Text bold color="yellow">
                        <Spinner type="material" />
                      </Text>
                    </Text>
                    <Text dimColor>
                      Depending on your network, it may take 3-8 minutes.
                    </Text>
                  </Box>
                );
              case AppStates.DOCKER_READY:
                return (
                  <Box flexDirection="column">
                    <Text bold color="green">
                      Status: Container ready! 🚀🚀
                    </Text>
                    <Newline />
                    <Text bold underline color="#7e57c2">
                      Services (press key to see logs)
                    </Text>
                    <Text>
                      <Text bold color="green">
                        [q]
                      </Text>{' '}
                      <Text inverse={logSource === LogSource.WebServer}>
                        {'web-server logs'.padEnd(40, ' ')}
                      </Text>{' '}
                      {readyServices.includes(LogSource.WebServer) ? (
                        <Text bold color="green">
                          READY
                        </Text>
                      ) : (
                        <Text color="yellow">STARTING</Text>
                      )}
                    </Text>
                    <Text>
                      <Text bold color="green">
                        [w]
                      </Text>{' '}
                      <Text inverse={logSource === LogSource.ApiServer}>
                        {'api-server logs'.padEnd(40, ' ')}
                      </Text>{' '}
                      {readyServices.includes(LogSource.ApiServer) ? (
                        <Text bold color="green">
                          READY
                        </Text>
                      ) : (
                        <Text color="yellow">STARTING</Text>
                      )}
                    </Text>
                    <Text>
                      <Text bold color="green">
                        [e]
                      </Text>{' '}
                      <Text inverse={logSource === LogSource.Redis}>
                        {'redis logs'.padEnd(40, ' ')}
                      </Text>{' '}
                      {readyServices.includes(LogSource.Redis) ? (
                        <Text bold color="green">
                          READY
                        </Text>
                      ) : (
                        <Text color="yellow">STARTING</Text>
                      )}
                    </Text>
                    <Text>
                      <Text bold color="green">
                        [r]
                      </Text>{' '}
                      <Text inverse={logSource === LogSource.Postgres}>
                        {'postgres logs'.padEnd(40, ' ')}
                      </Text>{' '}
                      {readyServices.includes(LogSource.Postgres) ? (
                        <Text bold color="green">
                          READY
                        </Text>
                      ) : (
                        <Text color="yellow">STARTING</Text>
                      )}
                    </Text>
                    <Text>
                      <Text bold color="green">
                        [t]
                      </Text>{' '}
                      <Text inverse={logSource === LogSource.InitDb}>
                        {'init_db logs'.padEnd(40, ' ')}
                      </Text>{' '}
                      {readyServices.includes(LogSource.InitDb) ? (
                        <Text bold color="green">
                          READY
                        </Text>
                      ) : (
                        <Text color="yellow">STARTING</Text>
                      )}
                    </Text>
                    <Text>
                      <Text bold color="green">
                        [s]
                      </Text>{' '}
                      <Text inverse={logSource === LogSource.SyncServer}>
                        {'sync server logs'.padEnd(40, ' ')}
                      </Text>{' '}
                      {readyServices.includes(LogSource.SyncServer) ? (
                        <Text bold color="green">
                          READY
                        </Text>
                      ) : (
                        <Text color="yellow">STARTING</Text>
                      )}
                    </Text>
                    <Newline />
                    <Text>
                      <Text bold color="yellow">
                        [a]
                      </Text>{' '}
                      <Text inverse={logSource === LogSource.All}>
                        {'all logs combined'.padEnd(40, ' ')}
                      </Text>
                    </Text>
                    <Newline />
                    <Text>
                      <Text bold color="red">
                        [x]
                      </Text>{' '}
                      exit
                    </Text>
                    {Boolean(isUpdateAvailable) && (
                      <>
                        <Text bold color="yellow">
                          {isUpdateAvailable}
                        </Text>
                      </>
                    )}
                  </Box>
                );
              case AppStates.TEARDOWN:
                return (
                  <Text color="blueBright">
                    Status: Performing container teardown...{' '}
                    <Text bold color="red">
                      <Spinner type="material" />
                    </Text>
                  </Text>
                );
              case AppStates.TERMINATED:
                return (
                  <Text color="green" inverse bold>
                    {terminatedText}
                  </Text>
                );
              default:
                return (
                  <Text color="red">
                    Unhandled app state. Please exit and retry.
                  </Text>
                );
            }
          })()}
        </Box>
        {appState === AppStates.DOCKER_READY && (
          <Box flexDirection="column">
            <Newline count={2} />
            <Text bold underline color="#7e57c2">
              Access Info
            </Text>
            <Text bold>{`http://localhost:${frontend_port}`}</Text>
            <Text bold>{`http://localhost:${analytics_server_port}`}</Text>
            <Text bold>{`redis://${redis_host}:${redis_port}/0`}</Text>
            <Text
              bold
            >{`postgresql://${db_user}:${db_pass}@${db_host}:${db_port}/${db_name}`}</Text>
            <Text bold color="grey">
              --
            </Text>
            <Text bold>{`http://localhost:${sync_server_port}`}</Text>
          </Box>
        )}
      </Box>
    </>
  );
};

export function App() {
  return (
    <ReduxProvider store={store}>
      <CliUi />
    </ReduxProvider>
  );
}
