import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasAuthEnv, hasDatabaseEnv } from "@/db/env";
import { getAuth } from "@/lib/auth";

export async function getServerSession() {
  if (!hasDatabaseEnv() || !hasAuthEnv()) {
    return null;
  }

  return getAuth().api.getSession({
    headers: await headers(),
  });
}

export async function requireAuth() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireApiAuth() {
  const session = await getServerSession();

  if (!session) {
    return {
      session: null,
      response: new Response("Authentication required.", { status: 401 }),
    };
  }

  return { session, response: null };
}
