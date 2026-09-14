import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z
    .string()
    .url()
    .default(process.env.BETTER_AUTH_URL ?? "http://localhost:3000"),
});

const databaseEnvSchema = envSchema.pick({
  DATABASE_URL: true,
});

const authEnvSchema = envSchema.pick({
  BETTER_AUTH_SECRET: true,
  BETTER_AUTH_URL: true,
});

export type AppEnv = z.infer<typeof envSchema>;

export function getDatabaseUrl() {
  return process.env.CANOPY_DEV_DB_URL ?? process.env.DATABASE_URL;
}

export function getOpenAIKey() {
  return process.env.CANOPY_DEV_OPENAI_KEY ?? process.env.OPENAI_API_KEY;
}

export function getAuthSecret() {
  return process.env.CANOPY_DEV_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET;
}

export function getEnv(): AppEnv {
  return envSchema.parse({
    DATABASE_URL: getDatabaseUrl(),
    OPENAI_API_KEY: getOpenAIKey(),
    BETTER_AUTH_SECRET: getAuthSecret(),
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  });
}

export function getDatabaseEnv() {
  return databaseEnvSchema.parse({
    DATABASE_URL: getDatabaseUrl(),
  });
}

export function getAuthEnv() {
  return authEnvSchema.parse({
    BETTER_AUTH_SECRET: getAuthSecret(),
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  });
}

export function hasDatabaseEnv() {
  return Boolean(getDatabaseUrl());
}

export function hasOpenAIEnv() {
  return Boolean(getOpenAIKey());
}

export function hasAuthEnv() {
  return Boolean(getAuthSecret());
}
