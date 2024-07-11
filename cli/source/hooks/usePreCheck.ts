import { isFreePort } from 'find-free-ports';
import { useCallback, useState } from 'react';

import fs from 'fs';

import { PreCheckStates } from '../constants.js';
import { runCommand } from '../utils/run-command.js';

export const usePreCheck = ({
  db,
  redis,
  frontend,
  sync_server,
  analytics_server
}: {
  db: number;
  redis: number;
  frontend: number;
  sync_server: number;
  analytics_server: number;
}) => {
  const [daemon, setDaemon] = useState<PreCheckStates>(PreCheckStates.RUNNING);
  const [ports, setPorts] = useState<PreCheckStates>(PreCheckStates.RUNNING);
  const [composeFile, setComposeFile] = useState<PreCheckStates>(
    PreCheckStates.RUNNING
  );
  const [dockerFile, setDockerFile] = useState<PreCheckStates>(
    PreCheckStates.RUNNING
  );

  const callDaemonCheck = useCallback(() => {
    // For Docker daemon
    runCommand('docker', ['info'])
      .promise.then(() => {
        setDaemon(PreCheckStates.SUCCESS);
      })
      .catch((err) => {
        setDaemon(PreCheckStates.FAILED);
      });
  }, []);

  const callPortsCheck = useCallback(async () => {
    // For ports
    const ports_array = [db, redis, frontend, sync_server, analytics_server];
    if (ports_array.some((port) => isNaN(port))) {
      setPorts(PreCheckStates.FAILED);
    } else {
      const portPromises = ports_array.map(isFreePort);
      const checks = await Promise.allSettled(portPromises);
      if (checks.some((item) => item.status === 'rejected')) {
        setPorts(PreCheckStates.FAILED);
      } else {
        setPorts(PreCheckStates.SUCCESS);
      }
    }
  }, []);

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
    callDaemonCheck,
    callPortsCheck,
    callFilesCheck
  };
};
