import { isFreePort } from 'find-free-ports';
import { useCallback, useState } from 'react';

import fs from 'fs';

import { PreCheckStates } from '../constants.js';
import {
  containerExistsAndRunning,
  shouldRebuildContainers,
  clearContainerCache,
  shouldOnlyRestartApp
} from '../utils/docker-config.js';
import { runCommand } from '../utils/run-command.js';

export const usePreCheck = ({
  db,
  redis,
  frontend,
  sync_server,
  analytics_server,
  containerId = 'middleware-dev'
}: {
  db: number;
  redis: number;
  frontend: number;
  sync_server: number;
  analytics_server: number;
  containerId?: string;
}) => {
  const [daemon, setDaemon] = useState<PreCheckStates>(PreCheckStates.RUNNING);
  const [ports, setPorts] = useState<PreCheckStates>(PreCheckStates.RUNNING);
  const [composeFile, setComposeFile] = useState<PreCheckStates>(
    PreCheckStates.RUNNING
  );
  const [dockerFile, setDockerFile] = useState<PreCheckStates>(
    PreCheckStates.RUNNING
  );
  const [containerStatus, setContainerStatus] = useState<PreCheckStates>(
    PreCheckStates.RUNNING
  );
  const [appOnlyRestart, setAppOnlyRestart] = useState<boolean>(false);

  const callDaemonCheck = useCallback(() => {
    // For Docker daemon
    runCommand('docker', ['info'])
      .promise.then(() => {
        setDaemon(PreCheckStates.SUCCESS);
        checkContainerStatus();
      })
      .catch((err) => {
        setDaemon(PreCheckStates.FAILED);
        setContainerStatus(PreCheckStates.FAILED);
      });
  }, []);

  const checkContainerStatus = useCallback(async () => {
    try {
      const isRunning = await containerExistsAndRunning(containerId);
      if (isRunning) {
        setContainerStatus(PreCheckStates.SUCCESS);
        await checkOnlyRestartApp();
      } else {
        setContainerStatus(PreCheckStates.FAILED);
        setAppOnlyRestart(false);
      }
    } catch (error) {
      setContainerStatus(PreCheckStates.FAILED);
      setAppOnlyRestart(false);
    }
  }, [checkOnlyRestartApp, containerId]);

  const checkOnlyRestartApp = useCallback(async () => {
    try {
      const onlyRestartApp = await shouldOnlyRestartApp(containerId);
      setAppOnlyRestart(onlyRestartApp);
      return onlyRestartApp;
    } catch (error) {
      setAppOnlyRestart(false);
      return false;
    }
  }, [containerId]);

  const resetContainerCache = useCallback(() => {
    clearContainerCache();
  }, []);

  const checkRebuildNeeded = useCallback(async () => {
    return await shouldRebuildContainers(containerId);
  }, [containerId]);

  const callPortsCheck = useCallback(async () => {
    // For ports
    const ports_array = [db, redis, frontend, sync_server, analytics_server];
    if (ports_array.some((port) => isNaN(port))) {
      setPorts(PreCheckStates.FAILED);
    } else {
      const portPromises = ports_array.map(isFreePort);
      const checks = await Promise.allSettled(portPromises);
      if (
        checks.some(
          (item) => item.status === 'rejected' || item.value === false
        )
      ) {
        setPorts(PreCheckStates.FAILED);
      } else {
        setPorts(PreCheckStates.SUCCESS);
      }
    }
  }, [db, redis, frontend, sync_server, analytics_server]);

  const callFilesCheck = useCallback(() => {
    // For files
    fs.promises
      .access('../docker-compose.yml')
      .then(() => {
        setComposeFile(PreCheckStates.SUCCESS);
      })
      .catch((err) => {
        setComposeFile(PreCheckStates.FAILED);
      });

    fs.promises
      .access('../Dockerfile.dev')
      .then(() => setDockerFile(PreCheckStates.SUCCESS))
      .catch(() => setDockerFile(PreCheckStates.FAILED));
  }, []);

  return {
    daemon,
    ports,
    composeFile,
    dockerFile,
    containerStatus,
    appOnlyRestart,
    callDaemonCheck,
    callPortsCheck,
    callFilesCheck,
    checkContainerStatus,
    checkOnlyRestartApp,
    resetContainerCache,
    checkRebuildNeeded
  };
};
