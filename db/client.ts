import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseEnv } from "@/db/env";
import * as schema from "@/db/schema";

function createSql() {
  const env = getDatabaseEnv();
  return neon(env.DATABASE_URL);
}

function createDb() {
  return drizzle(getSql(), { schema });
}

let cachedDb: ReturnType<typeof createDb> | undefined;
let cachedSql: ReturnType<typeof createSql> | undefined;

export function getSql() {
  if (!cachedSql) {
    cachedSql = createSql();
  }

  return cachedSql;
}

export function getDb() {
  if (!cachedDb) {
    cachedDb = createDb();
  }

  return cachedDb;
}
