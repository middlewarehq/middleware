import { Box, Newline, Static, Text, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { splitEvery } from 'ramda';
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { ChildProcessWithoutNullStreams } from 'child_process';

import {
  AppStates,
  LogSource,
  READY_MESSAGES,
  logoText,
  terminatedText
} from './constants.js';
import { useAppContext, AppContextProvider } from './hooks/useAppContext.js';
import { useLogsFromAllSources } from './hooks/useLogsFromAllSources.js';
import { getLineLimit } from './utils/line-limit.js';
import { runCommand } from './utils/run-command.js';

const CliUi = () => {
  const {
    logsStream,
    appState,
    setAppState,
    logSource,
    setLogSource,
    addLog,
    readyServices
  } = useAppContext();
  useLogsFromAllSources();

  const { exit } = useApp();

  const lineLimit = getLineLimit();

  const processRef = useRef<ChildProcessWithoutNullStreams | null>();

  const runCommandOpts = useMemo<Parameters<typeof runCommand>['2']>(
    () => ({
      onData: (line) =>
        line
          .split('\n')
          .flatMap((l) => splitEvery(lineLimit, l))
          .map((l) =>
            addLog(
              <Text>
                <Text color="yellow" bold inverse>
                  CNTNR
                </Text>{' '}
                {l}
              </Text>
            )
          ),
      onErr: (line) =>
        line
          .split('\n')
          .flatMap((l) => splitEvery(lineLimit, l))
          .map((l) =>
            addLog(
              <Text color="red">
                <Text color="red" bold inverse>
                  CNTNR
                </Text>{' '}
                {l}
              </Text>
            )
          )
    }),
    [addLog, lineLimit]
  );

  const handleExit = useCallback(() => {
    setAppState(AppStates.TEARDOWN);
    setTimeout(() => {
      if (!processRef.current) return;

      processRef.current.kill();
      processRef.current.stdout.destroy();
      processRef.current.stderr.destroy();

      runCommand('docker-compose', ['down'], runCommandOpts).promise.finally(
        () => {
          setAppState(AppStates.TERMINATED);
        }
      );
    }, 200);
  }, [runCommandOpts, setAppState]);

  useEffect(() => {
    if (appState !== AppStates.TERMINATED) return;
    exit();
  }, [appState, exit]);

  useInput((input) => {
    if (appState === AppStates.DOCKER_READY) {
      if (input === 'q') {
        setLogSource(LogSource.WebServer);
      } else if (input === 'w') {
        setLogSource(LogSource.ApiServer);
      } else if (input === 'e') {
        setLogSource(LogSource.Redis);
      } else if (input === 'r') {
        setLogSource(LogSource.Postgres);
      } else if (input === 't') {
        setLogSource(LogSource.InitDb);
      } else if (input === 'a') {
        setLogSource(LogSource.All);
      }
    }

    if (input === 'x') {
      handleExit();
    }
  });

  useEffect(() => {
    const { process, promise } = runCommand(
      'docker-compose',
      ['watch'],
      runCommandOpts
    );

    promise.catch(() => {
      handleExit();
      addLog('"docker watch" exited');
    });

    processRef.current = process;

    const lineListener = (data: Buffer) => {
      let watch_logs = String(data);

      if (
        READY_MESSAGES[LogSource.DockerWatch].some((rdyMsg) =>
          watch_logs.includes(rdyMsg)
        )
      ) {
        addLog('\n🚀 Container ready 🚀\n');
        setAppState(AppStates.DOCKER_READY);
      }
    };

    process?.stdout.on('data', lineListener);
    process?.stderr.on('data', lineListener);

    globalThis.process.on('exit', handleExit);
    return () => {
      globalThis.process.off('exit', handleExit);
    };
  }, [addLog, exit, handleExit, runCommandOpts, setAppState]);

  return (
    <>
      <Static items={logsStream} style={{ flexDirection: 'column' }}>
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
                      {readyServices.has(LogSource.WebServer) ? (
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
                      {readyServices.has(LogSource.ApiServer) ? (
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
                      {readyServices.has(LogSource.Redis) ? (
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
                      {readyServices.has(LogSource.Postgres) ? (
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
                      {readyServices.has(LogSource.InitDb) ? (
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
            <Text bold>http://localhost:3333</Text>
            <Text bold>http://localhost:9696</Text>
            <Text bold>http://localhost:6380</Text>
            <Text bold>http://localhost:5434</Text>
            <Text bold color="grey">
              --
            </Text>
          </Box>
        )}
      </Box>
    </>
  );
};

export function App() {
  const [appState, setAppState] = useState<AppStates>(AppStates.INIT);
  const [logSource, setLogSource] = useState<LogSource>(LogSource.All);
  const [readyServices, setReadyServices] = useState<
    Set<Omit<LogSource, LogSource.All>>
  >(new Set());

  const [logsStream, setLogsStream] = useState<ReactNode[]>([
    <Box
      borderStyle="double"
      borderColor="#7e57c2"
      key={0}
      flexDirection="column"
    >
      <Text color="#7e57c2">{logoText}</Text>
      <Text bold>Open Source</Text>
    </Box>,
    <Newline key={2} />
  ]);

  const addLog = useCallback((newNodes: ReactNode | ReactNode[]) => {
    setLogsStream((nodes) => nodes.concat(newNodes));
  }, []);

  const updateReadyServices = useCallback(
    (svcs: Omit<LogSource, LogSource.All>) => {
      setReadyServices((set) => {
        set.add(svcs);
        return new Set(set);
      });
    },
    []
  );

  return (
    <AppContextProvider
      value={{
        appState,
        setAppState,
        logsStream,
        setLogsStream,
        logSource,
        setLogSource,
        addLog,
        readyServices,
        updateReadyServices
      }}
    >
      <CliUi />
    </AppContextProvider>
  );
}
