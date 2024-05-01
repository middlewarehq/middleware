import { ReactNode } from 'react';
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
  INIT = 'INIT',
  DOCKER_READY = 'DOCKER_READY',
  TEARDOWN = 'TEARDOWN',
  TERMINATED = 'TERMINATED'
}

export enum LogSource {
  All,
  WebServer,
  ApiServer,
  Redis,
  InitDb,
  Postgres,
  Cron,
  DockerWatch
}

export type LogEntry = { time: Date; line: ReactNode };

export const keysForLogSource = Object.entries(LogSource).reduce(
  (map, [k, v]) => ({ ...map, [v]: k as keyof typeof LogSource }),
  {} as Record<number, keyof typeof LogSource>
);

export const READY_MESSAGES = {
  [LogSource.ApiServer]: `Listening at: http://0.0.0.0`,
  [LogSource.WebServer]: [
    `Server started on http://localhost`,
    `http://localhost:`
  ],
  [LogSource.Postgres]: `database system is ready to accept connections`,
  [LogSource.Redis]: `Ready to accept connections`,
  [LogSource.InitDb]: [`exit 0`, `Writing: ./db/schema.sql`],
  [LogSource.DockerWatch]: [
    `Watch configuration for service`,
    `watch enabled`,
    `watching`
  ]
};
