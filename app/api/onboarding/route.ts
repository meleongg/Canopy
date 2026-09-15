import { z } from "zod";
import { hasDatabaseEnv } from "@/db/env";
import {
  CHINESE_SCRIPTS,
  CORRECTION_STYLES,
  IMPORT_LANGUAGES,
  PLAYBACK_SPEEDS,
  PROFICIENCY_LEVELS,
  completeOnboarding,
  getUserPreferences,
} from "@/lib/user-preferences";
import { requireApiAuth } from "@/lib/session";

const onboardingSchema = z.object({
  importLanguage: z.enum(IMPORT_LANGUAGES),
  chineseScript: z.enum(CHINESE_SCRIPTS),
  proficiency: z.enum(PROFICIENCY_LEVELS),
  correctionStyle: z.enum(CORRECTION_STYLES),
  playbackSpeed: z.enum(PLAYBACK_SPEEDS),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;
  if (!hasDatabaseEnv()) {
    return new Response("Database configuration is unavailable.", {
      status: 503,
    });
  }

  const body = await request.json();
  const result = onboardingSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: "Provide valid onboarding choices." }, {
      status: 400,
    });
  }

  const preferences = await getUserPreferences(auth.session.user.id);
  const nextPreferences = { ...preferences, ...result.data };
  await completeOnboarding(auth.session.user.id, nextPreferences);
  return Response.json(nextPreferences);
}
