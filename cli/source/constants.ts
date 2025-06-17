export const logoText = `
██╗  ██╗█╗████╗ ████╗ █╗   █████╗█╗    █╗ ███╗ ████╗ █████╗
███╗███║█║█╔══█╗█╔══█╗█║   █╔═══╝█║    █║█╔══█╗█╔══█╗█╔═══╝
█╔███╔█║█║█║  █║█║  █║█║   ███╗  █║ █╗ █║█████║████╔╝███╗
█║╚█╔╝█║█║█║  █║█║  █║█║   █╔═╝  █║███╗█║█╔══█║█╔══█╗█╔═╝
█║ ╚╝ █║█║████╔╝████╔╝████╗█████╗╚██╔██╔╝█║  █║█║  █║█████╗
╚╝    ╚╝╚╝╚═══╝ ╚═══╝ ╚═══╝╚════╝ ╚═╝╚═╝ ╚╝  ╚╝╚╝  ╚╝╚════╝
`.trim();

export const terminatedText = `
                                         \n\
 ✅ Dev setup closed                     \n\
                                         `;

export enum AppStates {
  PREREQ_CHECK = 'PREREQ_CHECK',
  INIT = 'INIT',
  DOCKER_READY = 'DOCKER_READY',
  TEARDOWN = 'TEARDOWN',
  TERMINATED = 'TERMINATED'
}

export enum PreCheckStates {
  FAILED,
  RUNNING,
  SUCCESS
}

export enum PreCheckProperties {
  DAEMON = 'daemon',
  PORTS = 'ports',
  COMPOSE_FILE = 'compose file',
  DOCKER_FILE = 'docker file'
}

export enum LogSource {
  All,
  WebServer,
  ApiServer,
  SyncServer,
  Redis,
  InitDb,
  Postgres,
  Queue,
  Cron,
  DockerWatch,
  DockerWatchProcessIdLock
}

export enum ErrorCodes {
  SpawnProcessCommandNotFound = '-2'
}

export type LogEntry = {
  type:
    | 'data'
    | 'error'
    | 'showing-logs'
    | 'continuing-logs'
    | 'intro'
    | 'run-command-error'
    | 'run-command-on-data'
    | 'default';
  line: string | undefined;
  color?: string;
  prefix?: string;
  time: Date;
};

export const keysForLogSource = Object.entries(LogSource).reduce(
  (map, [k, v]) => ({ ...map, [v]: k as keyof typeof LogSource }),
  {} as Record<number, keyof typeof LogSource>
);

export const READY_MESSAGES = {
  [LogSource.ApiServer]: `Listening at: http://0.0.0.0`,
  [LogSource.SyncServer]: `Listening at: http://0.0.0.0`,
  [LogSource.WebServer]: [
    `Server started on http://localhost`,
    `http://localhost:`
  ],
  [LogSource.Postgres]: `database system is ready to accept connections`,
  [LogSource.Redis]: `Ready to accept connections`,
  [LogSource.InitDb]: [`exit 0`, `Writing: ./db/schema.sql`],
  [LogSource.Queue]: `Starting worker`,
  [LogSource.DockerWatch]: [
    `Watch configuration for service`,
    `Watch enabled`,
    `watch enabled`,
    `watching`
  ],
  [LogSource.DockerWatchProcessIdLock]: [
    `cannot take exclusive lock for project`
  ]
};
