import * as yup from 'yup';

import { exec } from 'child_process';

import { handleRequest, handleSyncServerRequest } from '@/api-helpers/axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';
import { ServiceNames } from '@/slices/service';
import { dbRaw } from '@/utils/db';

const getStatusSchema = yup.object().shape({});

const endpoint = new Endpoint(nullSchema);

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

endpoint.handle.GET(getStatusSchema, async (req, res) => {
  console.log('Fetching service status...');

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

  console.log(statuses);

  return res.send({ statuses });
});

export default endpoint.serve();
