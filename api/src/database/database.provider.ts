import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export function createDatabase(connectionString: string): Database {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pg = require('postgres');
  const sql = pg(connectionString);
  return drizzle(sql, { schema });
}

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';
