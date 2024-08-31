import { exec } from 'child_process';

import { handleRequest, handleSyncServerRequest } from '@/api-helpers/axios';
import { ServiceNames } from '@/constants/service';
import { ApiRequest, ApiResponse } from '@/types/request';
import { dbRaw } from '@/utils/db';

export default async function handler(
  request: ApiRequest,
  response: ApiResponse
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

  const statuses = await getStatus();
  const Status = {
    statuses: statuses
  };
  response.write(`data: ${JSON.stringify(Status)}\n\n`);

  response.on('close', () => {
    console.log('Client disconnected');
    // clearInterval(intervalId);
    response.end();
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
