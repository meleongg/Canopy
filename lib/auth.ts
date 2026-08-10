import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db/client";
import { getAuthEnv } from "@/db/env";

function createAuth() {
  const env = getAuthEnv();
  const baseURL = process.env.VERCEL
    ? {
        allowedHosts: ["usecanopy.vercel.app", "canopy-*.vercel.app"],
        fallback: env.BETTER_AUTH_URL,
        protocol: "https" as const,
      }
    : env.BETTER_AUTH_URL;

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
    }),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [nextCookies()],
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

let authInstance: AuthInstance | undefined;

export function getAuth() {
  if (!authInstance) {
    authInstance = createAuth();
  }

  return authInstance;
}

export async function authHandler(request: Request) {
  return getAuth().handler(request);
}
