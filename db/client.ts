import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getEnv } from "@/db/env";
import * as schema from "@/db/schema";

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!cachedDb) {
    const env = getEnv();
    cachedDb = drizzle(neon(env.DATABASE_URL), { schema });
  }

  return cachedDb;
}
