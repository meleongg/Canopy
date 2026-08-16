import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { userPreferences } from "@/db/schema";

export const IMPORT_LANGUAGES = ["zh-CN", "zh-HK", "fr-FR", "und"] as const;
export const THEMES = ["light", "dark"] as const;

export type ImportLanguage = (typeof IMPORT_LANGUAGES)[number];
export type ThemePreference = (typeof THEMES)[number];

export type UserPreferences = {
  theme: ThemePreference;
  importLanguage: ImportLanguage;
};

const defaultPreferences: UserPreferences = {
  theme: "dark",
  importLanguage: "zh-CN",
};

export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences> {
  const [preferences] = await getDb()
    .select({
      theme: userPreferences.theme,
      importLanguage: userPreferences.importLanguage,
    })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId));

  return preferences ?? defaultPreferences;
}

export async function updateUserPreferences(
  userId: string,
  preferences: UserPreferences,
) {
  await getDb()
    .insert(userPreferences)
    .values({ userId, ...preferences, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { ...preferences, updatedAt: new Date() },
    });
}
