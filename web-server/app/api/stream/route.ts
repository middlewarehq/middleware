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
  FileEvent,
  SendEventData
} from '@/constants/stream';

async function executeCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

async function isApiServerUp(): Promise<boolean> {
  try {
    const statusCode = await getServerStatusCode('');
    return statusCode === 200;
  } catch {
    return false;
  }
}

async function isSyncServerUp(): Promise<boolean> {
  try {
    const statusCode = await getSyncServerStatusCode('');
    return statusCode === 200;
  } catch {
    return false;
  }
}

async function isRedisUp(): Promise<boolean> {
  try {
    const response = await executeCommand(
      `redis-cli -p ${process.env.REDIS_PORT} ping`
    );
    return response.includes('PONG');
  } catch {
    return false;
  }
}

async function isPostgresUp(): Promise<boolean> {
  try {
    const response = await executeCommand(
      `pg_isready -h ${process.env.DB_HOST} -p ${process.env.DB_PORT}`
    );
    return response.includes('accepting connections');
  } catch {
    return false;
  }
}

async function checkServiceStatus(serviceName: ServiceNames): Promise<boolean> {
  const statusCheckers = {
    [ServiceNames.API_SERVER]: isApiServerUp,
    [ServiceNames.SYNC_SERVER]: isSyncServerUp,
    [ServiceNames.REDIS]: isRedisUp,
    [ServiceNames.POSTGRES]: isPostgresUp
  };

  const checker = statusCheckers[serviceName];
  if (!checker) {
    console.warn(`Service ${serviceName} not recognized.`);
    return false;
  }

  try {
    return await checker();
  } catch (error) {
    console.error(`${serviceName} service is down:`, error);
    return false;
  }
}

async function getAllServicesStatus(): Promise<
  Record<ServiceNames, { isUp: boolean }>
> {
  const services = Object.values(ServiceNames);
  const statusPromises = services.map(async (service) => [
    service,
    { isUp: await checkServiceStatus(service) }
  ]);

  const statuses = Object.fromEntries(await Promise.all(statusPromises));
  return statuses as Record<ServiceNames, { isUp: boolean }>;
}

// Creates an event message for the stream.
function createEventMessage(
  eventType: StreamEventType,
  data: SendEventData
): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(
    `data: ${JSON.stringify({ type: eventType, ...data })}\n\n`
  );
}

export async function GET(): Promise<Response> {
  let isStreamActive = true;
  const filePositions: Record<string, number> = {};
  let statusUpdateTimer: NodeJS.Timeout | null = null;
  const fileWatchers: FSWatcher[] = [];

  const stream = new ReadableStream({
    start(controller) {
      // Sends status updates periodically.
      async function sendStatusUpdates() {
        if (!isStreamActive) return;

        try {
          const statuses = await getAllServicesStatus();
          if (isStreamActive) {
            controller.enqueue(
              createEventMessage(StreamEventType.StatusUpdate, { statuses })
            );
          }
        } catch (error) {
          console.error('Error sending statuses:', error);
        }

        if (isStreamActive) {
          statusUpdateTimer = setTimeout(sendStatusUpdates, UPDATE_INTERVAL);
        }
      }

      // Sends log file updates.
      async function sendLogUpdates(logFile: LogFile) {
        if (!isStreamActive) return;

        try {
          const { path, serviceName } = logFile;
          const fileStream = createReadStream(path, {
            start: filePositions[path] || 0,
            encoding: 'utf8'
          });

          for await (const chunk of fileStream) {
            if (!isStreamActive) break;
            controller.enqueue(
              createEventMessage(StreamEventType.LogUpdate, {
                serviceName,
                content: chunk
              })
            );
            filePositions[path] =
              (filePositions[path] || 0) + Buffer.byteLength(chunk);
          }
        } catch (error) {
          console.error(
            `Error reading log file for ${logFile.serviceName}:`,
            error
          );
        }
      }

      // Sets up file watchers for log files.
      function setupFileWatchers() {
        LOG_FILES.forEach((logFile) => {
          const watcher = watch(logFile.path, async (eventType) => {
            if (eventType === FileEvent.Change && isStreamActive) {
              await sendLogUpdates(logFile);
            }
          });
          fileWatchers.push(watcher);
        });
      }

      // Initialize the stream
      sendStatusUpdates();
      LOG_FILES.forEach(sendLogUpdates);
      setupFileWatchers();
    },
    cancel() {
      isStreamActive = false;
      if (statusUpdateTimer) clearTimeout(statusUpdateTimer);
      fileWatchers.forEach((watcher) => watcher.close());
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

// This line is necessary to prevent Next.js from attempting to statically generate this API route.
// It forces the route to be dynamically rendered on each request, which is crucial for our
// real-time streaming functionality. Without this, Next.js might try to pre-render the route
// during build time, leading to timeouts or incorrect behavior.
export const dynamic = "force-dynamic";
