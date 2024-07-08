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
    if (
      isNaN(db) ||
      isNaN(redis) ||
      isNaN(frontend) ||
      isNaN(sync_server) ||
      isNaN(analytics_server)
    ) {
      setPorts(PreCheckStates.FAILED);
    } else {
      const db_check = await isFreePort(db);
      const redis_check = await isFreePort(redis);
      const frontend_check = await isFreePort(frontend);
      const sync_server_check = await isFreePort(sync_server);
      const analytics_server_check = await isFreePort(analytics_server);
      if (
        !db_check ||
        !redis_check ||
        !frontend_check ||
        !sync_server_check ||
        !analytics_server_check
      ) {
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
