import { ServiceNames } from './service';
export type LogFile = {
  path: string;
  serviceName: ServiceNames;
};
export type ServiceStatus = {
  [key in ServiceNames]: { isUp: boolean };
};

export const UPDATE_INTERVAL = 5000;

export const LOG_FILES: LogFile[] = [
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
