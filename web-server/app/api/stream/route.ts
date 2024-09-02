import { NextRequest } from 'next/server';

import { exec } from 'child_process';

import { handleRequest, handleSyncServerRequest } from '@/api-helpers/axios';
import { ServiceNames } from '@/constants/service';
// import { dbRaw } from '@/utils/db';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();
  let count = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let streamClosed = false;


  const sendStatuses = async () => {
    console.log('Set Status');
    // Fetch the statuses
    const statuses = await getStatus();
    const statusData = { type: 'status-update', statuses: statuses };

    //         await writer.write(encoder.encode(`data: ${data}\n\n`));

    // Send the data to the client
    // response.write(`data: ${JSON.stringify(statusData)}\n\n`);
    writer.write(encoder.encode(`data: ${JSON.stringify(statusData)}\n\n`));

    // Call this function again after 15 seconds
    timeoutId = setTimeout(sendStatuses, 15000);
  };

  // Start the recursive process
  sendStatuses(); // Set initial timeout

  // Close the stream if the client disconnects and stop the timeout
  request.signal.onabort = () => {
    console.log('Client disconnected. Closing writer.');
    closeStream();
  };

  const closeStream = () => {
    if (!streamClosed) {
      streamClosed = true;
      writer.close().catch((error) => {
        console.error('Error closing writer:', error);
      });
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  };

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform'
    }
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
        if (response.message.includes('hello world')) {
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

        if (response.trim().includes('PONG')) {
          isUp = true;
        }
      } catch (error) {
        console.error('Redis service is down:', error);
        isUp = false;
      }
      break;
    case ServiceNames.POSTGRES:
      try {
        // await dbRaw.raw('SELECT NOW()');
        const POSTGRES_PORT = process.env.DB_PORT; // Default port for PostgreSQL
        const POSTGRES_HOST = process.env.DB_HOST;

        // Using pg_isready to check if the server is up
        const response = await execPromise(
          `pg_isready -h ${POSTGRES_HOST} -p ${POSTGRES_PORT}`
        );

        if (response.includes('accepting connections')) {
          isUp = true;
        } else {
          isUp = false;
        }
      } catch (error) {
        console.error('PostgreSQL service is down:', error);
        isUp = false;
      }
      break;
    case ServiceNames.SYNC_SERVER:
      try {
        const response = await handleSyncServerRequest('');
        if (response.message.includes('hello world')) {
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
