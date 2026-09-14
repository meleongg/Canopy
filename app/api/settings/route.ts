import { z } from "zod";
import { hasDatabaseEnv } from "@/db/env";
import {
  IMPORT_LANGUAGES,
  CHINESE_SCRIPTS,
  CONVERSATION_GOALS,
  CORRECTION_STYLES,
  FORMALITY_LEVELS,
  PLAYBACK_SPEEDS,
  PROFICIENCY_LEVELS,
  READING_SIZES,
  THEMES,
  getUserPreferences,
  updateUserPreferences,
} from "@/lib/user-preferences";
import { requireApiAuth } from "@/lib/session";

const settingsSchema = z.object({
  theme: z.enum(THEMES),
  importLanguage: z.enum(IMPORT_LANGUAGES),
  readingSize: z.enum(READING_SIZES),
  proficiency: z.enum(PROFICIENCY_LEVELS),
  correctionStyle: z.enum(CORRECTION_STYLES),
  conversationGoal: z.enum(CONVERSATION_GOALS),
  chineseScript: z.enum(CHINESE_SCRIPTS),
  formality: z.enum(FORMALITY_LEVELS),
  playbackSpeed: z.enum(PLAYBACK_SPEEDS),
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
