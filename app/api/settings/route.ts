import { z } from "zod";
import { hasDatabaseEnv } from "@/db/env";
import {
  IMPORT_LANGUAGES,
  THEMES,
  getUserPreferences,
  updateUserPreferences,
} from "@/lib/user-preferences";
import { requireApiAuth } from "@/lib/session";

const settingsSchema = z.object({
  theme: z.enum(THEMES),
  importLanguage: z.enum(IMPORT_LANGUAGES),
});

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;
  if (!hasDatabaseEnv()) {
    return new Response("Database configuration is unavailable.", {
      status: 503,
    });
  }

  return Response.json(await getUserPreferences(auth.session.user.id));
}

export async function PATCH(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;
  if (!hasDatabaseEnv()) {
    return new Response("Database configuration is unavailable.", {
      status: 503,
    });
  }

  const result = settingsSchema.safeParse(await request.json());
  if (!result.success) {
    return Response.json({ error: "Provide valid settings." }, { status: 400 });
  }

  await updateUserPreferences(auth.session.user.id, result.data);
  return Response.json(result.data);
}
