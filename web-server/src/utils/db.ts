import knex, { Knex } from 'knex';

import { Row, Columns } from '@/constants/db';

export const userIdentityAvatar = (href: string) => ({
  avatar_url: { href }
});

const DEV = 'development';

const knexInstance = <T extends keyof typeof Columns>() => {
  const createConnection = () =>
    knex<Row<T>>({
      client: 'pg',
      connection: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        application_name: `web-manager-dash--${
          process.env.NEXT_PUBLIC_APP_ENVIRONMENT
        }--${process.env.USER || 'UNSPECIFIED'}`
      },
      searchPath: ['public'],
      pool: {
        min: 0,
        max: process.env.NEXT_PUBLIC_APP_ENVIRONMENT === DEV ? 2 : 7
      }
    });

  if (process.env.NEXT_PUBLIC_APP_ENVIRONMENT === 'development') {
    (global as any).__POSTGRES_KNEX_DB_CONNECTION__ =
      (global as any).__POSTGRES_KNEX_DB_CONNECTION__ || createConnection();
    return (global as any).__POSTGRES_KNEX_DB_CONNECTION__;
  }

  return createConnection();
};

// @ts-ignore -- it works for now, but we should properly type it later
export const db: <T extends keyof typeof Columns>(table: T) => Knex<Row<T>> =
  knexInstance();

export const dbRaw = db as unknown as Knex;

export const getCountFromQuery = (result: any[]) => {
  try {
    if (!Array.isArray(result)) return 0;
    return Number(result[0]?.count);
  } catch {
    return 0;
  }
};

export const getFirstRow = <T = any>(rows: T[]): T => rows[0];

export const doUpsertCheck = () =>
  dbRaw.raw<{ inserted: boolean }[]>('(xmax = 0) as inserted');
