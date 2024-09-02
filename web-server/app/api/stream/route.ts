import { NextRequest } from 'next/server';
import { exec } from 'child_process';
import { handleRequest, handleSyncServerRequest } from '@/api-helpers/axios';
import { ServiceNames } from '@/constants/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Utility function to execute shell commands as promises
const execPromise = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve(stdout);
    });
  });
};

// Utility function to check if a service is up
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

// Function to get the status of all services
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

// Stream handling function
export async function GET(request: NextRequest): Promise<Response> {
  const responseStream = new TransformStream();

// Increase the max listeners limit to avoid warnings
process.setMaxListeners(20);

// Utility function to execute shell commands as promises
const execPromise = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve(stdout);
    });
  });
};

// Utility function to check if a service is up
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

// Function to get the status of all services
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

// Stream handling function
export async function GET(request: NextRequest): Promise<Response> {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();
  let timeoutId: NodeJS.Timeout | null = null;
  let streamClosed = false;

  // Function to send statuses to the client
  const sendStatuses = async () => {
    if (streamClosed) return; // Prevent sending if the stream is closed

    try {
      console.log('Fetching service statuses...');
      const statuses = await getStatus();
      const statusData = { type: 'status-update', statuses };
      await writer.write(
        encoder.encode(`data: ${JSON.stringify(statusData)}\n\n`)
      );
    } catch (error) {
      console.error('Error sending statuses:', error);
    }

    // Schedule the next status update
    timeoutId = setTimeout(sendStatuses, 15000);
  };

  // Start the initial status send
  sendStatuses();

  // Function to close the stream and clear timeout
  const closeStream = () => {
    console.log('CLIENT DISCONNECTED');
    if (!streamClosed) {
      streamClosed = true;
      writer
        .close()
        .catch((error) => console.error('Error closing writer:', error));
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  // Return the response stream
  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform'
    }
  });
}
