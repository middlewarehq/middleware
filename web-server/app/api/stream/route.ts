import { exec } from 'child_process';
import { createReadStream, FSWatcher, watch } from 'fs';

import { handleRequest, handleSyncServerRequest } from '@/api-helpers/axios';
import { ServiceNames } from '@/constants/service';
import {
  ServiceStatus,
  UPDATE_INTERVAL,
  LogFile,
  LOG_FILES
} from '@/constants/stream';

const execPromise = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        return reject(error);
      }
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
        const apiResponse = await handleRequest('');
        return apiResponse.message.includes('hello world');

      case ServiceNames.REDIS:
        const redisPingResponse = await execPromise(
          `redis-cli -p ${process.env.REDIS_PORT} ping`
        );
        return redisPingResponse.trim().includes('PONG');

      case ServiceNames.POSTGRES:
        const postgresResponse = await execPromise(
          `pg_isready -h ${process.env.DB_HOST} -p ${process.env.DB_PORT}`
        );
        return postgresResponse.includes('accepting connections');

      case ServiceNames.SYNC_SERVER:
        const syncServerResponse = await handleSyncServerRequest('');
        return syncServerResponse.message.includes('hello world');

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
  const statuses: ServiceStatus = {
    [ServiceNames.API_SERVER]: {
      isUp: false
    },
    [ServiceNames.REDIS]: {
      isUp: false
    },
    [ServiceNames.POSTGRES]: {
      isUp: false
    },
    [ServiceNames.SYNC_SERVER]: {
      isUp: false
    }
  };

  await Promise.all(
    services.map(async (service) => {
      statuses[service] = { isUp: await checkServiceStatus(service) };
    })
  );

  return statuses;
};

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();
  let streamClosed = false;
  let lastPositions: { [key: string]: number } = {};
  let statusTimer: NodeJS.Timeout | null = null;
  const watchers: FSWatcher[] = [];

  const sendEvent = (eventType: string, data: any) => {
    const eventData = JSON.stringify({ type: eventType, ...data });
    return encoder.encode(`data: ${eventData}\n\n`);
  };

  const stream = new ReadableStream({
    start(controller) {
      const pushStatus = async () => {
        if (streamClosed) return;
        try {
          const statuses = await getStatus();
          if (!streamClosed) {
            controller.enqueue(sendEvent('status-update', { statuses }));
          }
        } catch (error) {
          console.error('Error sending statuses:', error);
        }
        if (!streamClosed) {
          statusTimer = setTimeout(pushStatus, UPDATE_INTERVAL);
        }
      };

      const pushFileContent = async ({ path, serviceName }: LogFile) => {
        if (streamClosed) return;
        try {
          const fileStream = createReadStream(path, {
            start: lastPositions[path] || 0,
            encoding: 'utf8'
          });

          for await (const chunk of fileStream) {
            if (streamClosed) break;
            controller.enqueue(
              sendEvent('log-update', { serviceName, content: chunk })
            );
            lastPositions[path] =
              (lastPositions[path] || 0) + Buffer.byteLength(chunk);
          }
        } catch (error) {
          console.error(`Error reading log file for ${serviceName}:`, error);
        }
      };

      const startWatchers = () => {
        LOG_FILES.forEach((logFile) => {
          const watcher = watch(logFile.path, async (eventType) => {
            if (eventType === 'change' && !streamClosed) {
              await pushFileContent(logFile);
            }
          });
          watchers.push(watcher);
        });
      };

      pushStatus();
      LOG_FILES.forEach(pushFileContent);
      startWatchers();
    },
    cancel() {
      streamClosed = true;

      if (statusTimer) {
        clearTimeout(statusTimer);
      }

      watchers.forEach((watcher) => watcher.close());
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform'
    }
  });
}
