import { exec } from 'child_process';
import { createReadStream, FSWatcher, watch } from 'fs';

import { handleRequest, handleSyncServerRequest } from '@/api-helpers/axios';
import { ServiceNames } from '@/constants/service';
import {
  UPDATE_INTERVAL,
  LogFile,
  LOG_FILES,
  StreamEventType,
  FileEvent
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

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();
  let streamClosed = false;
  let lastPositions: { [key: string]: number } = {};
  let statusTimer: NodeJS.Timeout | null = null;
  const watchers: FSWatcher[] = [];

  const sendEvent = (eventType: StreamEventType, data: any) => {
    const eventData = JSON.stringify({ type: eventType, ...data });
    return encoder.encode(`data: ${eventData}\n\n`);
  };

  const stream = new ReadableStream({
    start(controller) {
      const pushStatus = async () => {
        console.log('push status');
        if (streamClosed) return;
        try {
          const statuses = await getStatus();
          if (!streamClosed) {
            controller.enqueue(
              sendEvent(StreamEventType.StatusUpdate, { statuses })
            );
          }
        } catch (error) {
          console.error('Error sending statuses:', error);
        }
        if (!streamClosed) {
          statusTimer = setTimeout(pushStatus, UPDATE_INTERVAL);
        }
      };

      const pushFileContent = async ({ path, serviceName }: LogFile) => {
        console.log('push content');

        if (streamClosed) return;
        try {
          const fileStream = createReadStream(path, {
            start: lastPositions[path] || 0,
            encoding: 'utf8'
          });

          for await (const chunk of fileStream) {
            if (streamClosed) break;
            controller.enqueue(
              sendEvent(StreamEventType.LogUpdate, {
                serviceName,
                content: chunk
              })
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
            if (eventType === FileEvent.Change && !streamClosed) {
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
      console.log('CLOSE ');
      streamClosed = true;

      if (statusTimer) {
        clearTimeout(statusTimer);
      }

      watchers.forEach((watcher) => watcher.close());
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'Content-Encoding': 'none'
    }
  });
}
