import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export function createDatabase(connectionString: string): Database {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const pg = require("postgres");
  const sql = pg(connectionString);
  return drizzle(sql, { schema });
}

export const DATABASE_CONNECTION = "DATABASE_CONNECTION";
