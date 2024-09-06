import { ServiceNames } from './service';

type LogFile = {
  path: string;
  serviceName: ServiceNames;
};

type ServiceStatus = Record<ServiceNames, { isUp: boolean }>;

const UPDATE_INTERVAL = 10000;

const LOG_FILES: LogFile[] = [
  {
    path: '/var/log/apiserver/apiserver.log',
    serviceName: ServiceNames.API_SERVER
  },
  {
    path: '/var/log/sync_server/sync_server.log',
    serviceName: ServiceNames.SYNC_SERVER
  },
  {
    path: '/var/log/redis/redis.log',
    serviceName: ServiceNames.REDIS
  },
  {
    path: '/var/log/postgres/postgres.log',
    serviceName: ServiceNames.POSTGRES
  }
];

enum StreamEventType {
  StatusUpdate = 'status-update',
  LogUpdate = 'log-update'
}

enum FileEvent {
  Change = 'change'
}

export type { LogFile, ServiceStatus };
export { UPDATE_INTERVAL, LOG_FILES, StreamEventType, FileEvent };
