import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";
import { env } from "../config/env.js";

// Create the postgres client
const client = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create the drizzle client with schema
export const db = drizzle(client, { schema });

// Export schema for use in queries
export { schema };

// Export type for use in services
export type Database = typeof db;
