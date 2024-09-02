import { NextRequest } from 'next/server';

import { exec } from 'child_process';
import { FSWatcher, createReadStream, watch } from 'fs';

import { handleRequest, handleSyncServerRequest } from '@/api-helpers/axios';
import { ServiceNames } from '@/constants/service';

type LogFile = {
  path: string;
  serviceName: ServiceNames;
};

type ServiceStatus = {
  [key in ServiceNames]: { isUp: boolean };
};

const UPDATE_INTERVAL = 5000;
const LOG_FILES: LogFile[] = [
  {
    path: '/var/log/apiserver/apiserver.log',
    serviceName: ServiceNames.API_SERVER
  },
  {
    path: '/var/log/sync_server/sync_server.log',
    serviceName: ServiceNames.SYNC_SERVER
  },
  { path: '/var/log/redis/redis.log', serviceName: ServiceNames.REDIS },
  { path: '/var/log/postgres/postgres.log', serviceName: ServiceNames.POSTGRES }
];

const execPromise = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) return reject(error);
      resolve(stdout);
    });
  });
};

const checkServiceStatus = async (
  serviceName: ServiceNames
): Promise<boolean> => {
  try {
    switch (serviceName) {
      case ServiceNames.API_SERVER:
        return (await handleRequest('')).message.includes('hello world');
      case ServiceNames.REDIS:
        return (
          await execPromise(`redis-cli -p ${process.env.REDIS_PORT} ping`)
        )
          .trim()
          .includes('PONG');
      case ServiceNames.POSTGRES:
        return (
          await execPromise(
            `pg_isready -h ${process.env.DB_HOST} -p ${process.env.DB_PORT}`
          )
        ).includes('accepting connections');
      case ServiceNames.SYNC_SERVER:
        return (await handleSyncServerRequest('')).message.includes(
          'hello world'
        );
      default:
        console.warn(`Service ${serviceName} not recognized.`);
        return false;
    }
  } catch (error) {
    console.error(`${serviceName} service is down:`, error);
    return false;
  }
};

const getStatus = async (): Promise<ServiceStatus> => {
  const services = Object.values(ServiceNames);
  const statuses = {} as ServiceStatus;

  await Promise.all(
    services.map(async (service) => {
      statuses[service] = { isUp: await checkServiceStatus(service) };
    })
  );

  return statuses;
};

export async function GET(request: NextRequest): Promise<Response> {
  const { writable, readable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  let timeoutId: NodeJS.Timeout | null = null;
  let streamClosed = false;
  let watchers: FSWatcher[] = [];
  let lastPositions: { [key: string]: number } = {};

  const sendEvent = async (eventType: string, data: any) => {
    if (streamClosed) return;
    await writer.write(
      encoder.encode(
        `data: ${JSON.stringify({ type: eventType, ...data })}\n\n`
      )
    );
  };

  const sendStatuses = async () => {
    if (streamClosed) return;
    try {
      const statuses = await getStatus();
      await sendEvent('status-update', { statuses });
    } catch (error) {
      console.error('Error sending statuses:', error);
    }
    if (!streamClosed) {
      timeoutId = setTimeout(sendStatuses, UPDATE_INTERVAL);
    }
  };

  const sendFileContent = async ({ path, serviceName }: LogFile) => {
    if (streamClosed) return;
    return new Promise<void>((resolve, reject) => {
      const stream = createReadStream(path, {
        start: lastPositions[path] || 0,
        encoding: 'utf8'
      });
      stream.on('data', async (chunk) => {
        if (streamClosed) return;
        await sendEvent('log-update', { serviceName, content: chunk });
        lastPositions[path] =
          (lastPositions[path] || 0) + Buffer.byteLength(chunk);
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });
  };

  const startWatchers = () => {
    LOG_FILES.forEach(async (logFile) => {
      await sendFileContent(logFile);
      const watcher = watch(logFile.path, async (eventType) => {
        if (eventType === 'change') {
          await sendFileContent(logFile);
        }
      });
      watchers.push(watcher);
    });
  };

  const cleanup = () => {
    if (!streamClosed) {
      streamClosed = true;
      writer
        .close()
        .catch((error) => console.error('Error closing writer:', error));
      if (timeoutId) clearTimeout(timeoutId);
    }
    watchers.forEach((watcher) => watcher.close());
    watchers = [];
  };

  sendStatuses();
  startWatchers();

  request.signal.onabort = cleanup;

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform'
    }
  });
}
