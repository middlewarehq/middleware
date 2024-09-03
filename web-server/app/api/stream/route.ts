import { NextRequest } from 'next/server';

import { exec } from 'child_process';
import { createReadStream, watch } from 'fs';

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
  const encoder = new TextEncoder();
  let streamClosed = false;
  let lastPositions: { [key: string]: number } = {};

  const sendEvent = (eventType: string, data: any) => {
    return encoder.encode(
      `data: ${JSON.stringify({ type: eventType, ...data })}\n\n`
    );
  };

  const stream = new ReadableStream({
    start(controller) {
      const pushStatus = async () => {
        if (streamClosed) return;
        try {
          const statuses = await getStatus();
          controller.enqueue(sendEvent('status-update', { statuses }));
        } catch (error) {
          console.error('Error sending statuses:', error);
        }
        setTimeout(pushStatus, UPDATE_INTERVAL);
      };

      const pushFileContent = async ({ path, serviceName }: LogFile) => {
        if (streamClosed) return;
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
      };

      const startWatchers = () => {
        LOG_FILES.forEach((logFile) => {
          watch(logFile.path, async (eventType) => {
            if (eventType === 'change' && !streamClosed) {
              await pushFileContent(logFile);
            }
          });
        });
      };

      pushStatus();
      LOG_FILES.forEach(pushFileContent);
      startWatchers();

      request.signal.addEventListener('abort', () => {
        streamClosed = true;
        controller.close();
      });
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
