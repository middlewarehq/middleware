import { NextRequest } from 'next/server';

import { exec } from 'child_process';
import { FSWatcher, createReadStream, watch } from 'fs';

import { handleRequest, handleSyncServerRequest } from '@/api-helpers/axios';
import { ServiceNames } from '@/constants/service';

export async function GET(request: NextRequest): Promise<Response> {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();
  let timeoutId: NodeJS.Timeout | null = null;
  let streamClosed = false;

  const sendStatuses = async () => {
    if (streamClosed) return; 

    try {
      console.log('Fetching service statuses...');
      const statuses = await getStatus();
      const statusData = { type: 'status-update', statuses };

      if (!streamClosed) {
        await writer.write(
          encoder.encode(`data: ${JSON.stringify(statusData)}\n\n`)
        );
      }
    } catch (error) {
      console.error('Error sending statuses:', error);
    }

    // Schedule the next status update
    if (!streamClosed) {
      timeoutId = setTimeout(sendStatuses, 10000);
    }
  };

  const logFiles = [
    {
      path: '/var/log/apiserver/apiserver.log',
      serviceName: ServiceNames.API_SERVER
    },
    {
      path: '/var/log/sync_server/sync_server.log',
      serviceName: ServiceNames.SYNC_SERVER
    },
    { path: '/var/log/redis/redis.log', serviceName: ServiceNames.REDIS },
    {
      path: '/var/log/postgres/postgres.log',
      serviceName: ServiceNames.POSTGRES
    }
  ];

  let watchers: FSWatcher[] = [];
  let lastPositions: { [key: string]: number } = {};

  const sendFileContent = async (filePath: string, serviceName: string) => {
    if (streamClosed) return; // Prevent sending if the stream is closed
    console.log(`Sending file content for ${serviceName}`);

    return new Promise<void>((resolve, reject) => {
      const stream = createReadStream(filePath, {
        start: lastPositions[filePath] || 0,
        encoding: 'utf8'
      });

      stream.on('data', (chunk) => {
        if (streamClosed) return; 
        const data = {
          type: 'log-update',
          serviceName,
          content: chunk
        };

        writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        lastPositions[filePath] =
          (lastPositions[filePath] || 0) + Buffer.byteLength(chunk);
      });

      stream.on('end', () => resolve());
      stream.on('error', (error) => reject(error));
    });
  };

  const startWatchers = () => {
    logFiles.forEach(async ({ path, serviceName }) => {
      await sendFileContent(path, serviceName);

      const watcher = watch(path, async (eventType) => {
        if (eventType === 'change') {
          console.log(`File ${path} (${serviceName}) has been changed`);
          await sendFileContent(path, serviceName);
        }
      });

      watchers.push(watcher);
      console.log(`Watcher created for ${path}`);
    });
  };

  const cleanupWatchers = () => {
    watchers.forEach((watcher) => watcher.close());
    watchers = [];
  };

  sendStatuses();
  startWatchers();

  const closeStream = () => {
    console.log('Client Disconnected');
    if (!streamClosed) {
      streamClosed = true;
      writer
        .close()
        .catch((error) => console.error('Error closing writer:', error));
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
    cleanupWatchers();
  };

  request.signal.onabort = closeStream;

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform'
    }
  });
}

process.setMaxListeners(20);
if (!process.listenerCount('SIGINT')) {
  process.on('SIGINT', () => {
    console.log('SIGINT received. Performing cleanup.');
    process.exit();
  });
}

const execPromise = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, _stderr) => {
      if (error) {
        return reject(error);
      }
      resolve(stdout);
    });
  });
};

const checkServiceStatus = async (serviceName: string): Promise<boolean> => {
  try {
    switch (serviceName) {
      case ServiceNames.API_SERVER: {
        const response = await handleRequest('');
        return response.message.includes('hello world');
      }

      case ServiceNames.REDIS: {
        const REDIS_PORT = process.env.REDIS_PORT;
        const response = await execPromise(`redis-cli -p ${REDIS_PORT} ping`);
        return response.trim().includes('PONG');
      }

      case ServiceNames.POSTGRES: {
        const POSTGRES_PORT = process.env.DB_PORT;
        const POSTGRES_HOST = process.env.DB_HOST;
        const response = await execPromise(
          `pg_isready -h ${POSTGRES_HOST} -p ${POSTGRES_PORT}`
        );
        return response.includes('accepting connections');
      }

      case ServiceNames.SYNC_SERVER: {
        const response = await handleSyncServerRequest('');
        return response.message.includes('hello world');
      }

      default:
        console.warn(`Service ${serviceName} not recognized.`);
        return false;
    }
  } catch (error) {
    console.error(`${serviceName} service is down:`, error);
    return false;
  }
};

const getStatus = async (): Promise<{
  [key in ServiceNames]: { isUp: boolean };
}> => {
  const services = Object.values(ServiceNames);
  const statuses: { [key in ServiceNames]: { isUp: boolean } } = {
    [ServiceNames.API_SERVER]: { isUp: false },
    [ServiceNames.REDIS]: { isUp: false },
    [ServiceNames.POSTGRES]: { isUp: false },
    [ServiceNames.SYNC_SERVER]: { isUp: false }
  };

  await Promise.all(
    services.map(async (service) => {
      const isUp = await checkServiceStatus(service);
      statuses[service] = { isUp };
    })
  );

  return statuses;
};
