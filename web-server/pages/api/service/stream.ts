import { exec } from 'child_process';
import { watch, createReadStream, FSWatcher } from 'fs';

import { handleRequest, handleSyncServerRequest } from '@/api-helpers/axios';
import { ServiceNames } from '@/constants/service';
import { dbRaw } from '@/utils/db';

import type { NextApiRequest, NextApiResponse } from 'next/types';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  console.log('SSE handler initialized');

  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('content-encoding', 'none');
  response.setHeader('Access-Control-Allow-Origin', '*'); // Enable CORS

  response.flushHeaders();

  // Send an initial message to establish the connection
  // response.write('data: Connected\n\n');

  // ---------------------------
  // const sendStatuses = async () => {
  //   // Fetch the statuses
  //   const statuses = await getStatus();
  //   const statusData = { type: 'status-update', statuses: statuses };

  //   // Send the data to the client
  //   response.write(`data: ${JSON.stringify(statusData)}\n\n`);

  //   // Call this function again after 15 seconds
  //   timeoutId = setTimeout(sendStatuses, 15000);
  // };

  // Start the recursive process
  // let timeoutId = setTimeout(sendStatuses, 15000); // Set initial timeout

  // -----------------------------
  const fullPath = '/var/log/apiserver/apiserver.log';
  let lastPosition = 0;

  const sendFileContent = async () => {
    console.log('SEnd file content');
    return new Promise<void>((resolve, reject) => {
      const stream = createReadStream(fullPath, {
        start: lastPosition,
        encoding: 'utf8'
      });
      stream.on('data', (chunk) => {
        const data = {
          type: 'log-update',
          serviceName: ServiceNames.API_SERVER,
          content: chunk
        };
        response.write(`data: ${JSON.stringify(data)}\n\n`);
        lastPosition += Buffer.byteLength(chunk);
      });
      stream.on('end', () => {
        response.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
        resolve();
      });
      stream.on('error', (error) => {
        reject(error);
      });
    });
  };

  let watcher: FSWatcher | null = null;

  if (!watcher) {
    watcher = watch(fullPath, async (eventType, filename) => {
      if (eventType === 'change') {
        console.log(`File ${filename} has been changed`);
        await sendFileContent();
      }
    });
    console.log('Watcher created for', fullPath);
  } else {
    console.log('Watcher already exists for', fullPath);
  }

  // Initial read of the file
  await sendFileContent();

  response.on('close', () => {
    console.log('Client disconnected');
    watcher.close(); // Ensure the watcher is closed
    response.end(); // End the response
  });

  response.on('finish', () => {
    console.log('Response finished');
    watcher.close(); // Close the watcher when response is finished
  });
}

const getStatus = async () => {
  const services = Object.values(ServiceNames);
  const statuses: { [key in ServiceNames]: { isUp: boolean } } = {
    [ServiceNames.API_SERVER]: { isUp: false },
    [ServiceNames.REDIS]: { isUp: false },
    [ServiceNames.POSTGRES]: { isUp: false },
    [ServiceNames.SYNC_SERVER]: { isUp: false }
  };

  for (const service of services) {
    const isUp = await checkServiceStatus(service);
    statuses[service] = { isUp: isUp };
  }

  return statuses;
};

const execPromise = (command: string) => {
  return new Promise<string>((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve(stdout);
    });
  });
};

const checkServiceStatus = async (serviceName: string): Promise<boolean> => {
  let isUp = false;
  switch (serviceName) {
    case ServiceNames.API_SERVER:
      try {
        const response = await handleRequest('');
        if (response.message === 'hello world') {
          isUp = true;
        }
      } catch (error) {
        console.error('API Server service is down:', error);
        isUp = false;
      }
      break;
    case ServiceNames.REDIS:
      try {
        const REDIS_PORT = process.env.REDIS_PORT;
        const response = await execPromise(`redis-cli -p ${REDIS_PORT} ping`);

        if (response.trim() === 'PONG') {
          isUp = true;
        }
      } catch (error) {
        console.error('Redis service is down:', error);
        isUp = false;
      }
      break;
    case ServiceNames.POSTGRES:
      try {
        await dbRaw.raw('SELECT 1');
        isUp = true;
      } catch (error) {
        console.error('PostgreSQL service is down:', error);
        isUp = false;
      }
      break;
    case ServiceNames.SYNC_SERVER:
      try {
        const response = await handleSyncServerRequest('');
        if (response.message === 'hello world') {
          isUp = true;
        }
      } catch (error) {
        console.error('Sync Server service is down:', error);
        isUp = false;
      }
      break;

    default:
      console.warn(`Service ${serviceName} not recognized.`);
      break;
  }

  return isUp;
};
