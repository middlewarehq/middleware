import { exec } from 'child_process';
import { createReadStream, FSWatcher, watch } from 'fs';

import {
  getServerStatusCode,
  getSyncServerStatusCode
} from '@/api-helpers/axios';
import { ServiceNames } from '@/constants/service';
import {
  UPDATE_INTERVAL,
  LogFile,
  LOG_FILES,
  StreamEventType,
  FileEvent
} from '@/constants/stream';

const execPromise = (command: string): Promise<string> =>
  new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout.trim());
    });
  });

const checkServiceStatus = async (
  serviceName: ServiceNames
): Promise<boolean> => {
  try {
    switch (serviceName) {
      case ServiceNames.API_SERVER:
        return (await getServerStatusCode('')) === 200;
      case ServiceNames.SYNC_SERVER:
        return (await getSyncServerStatusCode('')) === 200;
      case ServiceNames.REDIS:
        return (
          await execPromise(`redis-cli -p ${process.env.REDIS_PORT} ping`)
        ).includes('PONG');
      case ServiceNames.POSTGRES:
        return (
          await execPromise(
            `pg_isready -h ${process.env.DB_HOST} -p ${process.env.DB_PORT}`
          )
        ).includes('accepting connections');
      default:
        console.warn(`Service ${serviceName} not recognized.`);
        return false;
    }
  } catch (error) {
    console.error(`${serviceName} service is down:`, error);
    return false;
  }
};

const getStatus = async (): Promise<
  Record<ServiceNames, { isUp: boolean }>
> => {
  const services = Object.values(ServiceNames);
  const statuses = Object.fromEntries(
    services.map((service) => [service, { isUp: false }])
  ) as Record<ServiceNames, { isUp: boolean }>;

  await Promise.all(
    services.map(async (service) => {
      statuses[service].isUp = await checkServiceStatus(service);
    })
  );

  return statuses;
};

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();
  let streamClosed = false;
  const lastPositions: Record<string, number> = {};
  let statusTimer: NodeJS.Timeout | null = null;
  const watchers: FSWatcher[] = [];

  const sendEvent = (eventType: StreamEventType, data: unknown): Uint8Array =>
    encoder.encode(`data: ${JSON.stringify({ type: eventType, ...data })}\n\n`);

  const stream = new ReadableStream({
    start(controller) {
      const pushStatus = async () => {
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
      streamClosed = true;
      if (statusTimer) clearTimeout(statusTimer);
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
