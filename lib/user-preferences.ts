import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { userPreferences } from "@/db/schema";

export const IMPORT_LANGUAGES = ["zh-CN", "zh-HK", "fr-FR", "und"] as const;
export const THEMES = ["light", "dark"] as const;
export const READING_SIZES = ["default", "large", "extra-large"] as const;
export const PROFICIENCY_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
] as const;
export const CORRECTION_STYLES = ["gentle", "direct", "on-request"] as const;
export const CONVERSATION_GOALS = [
  "everyday",
  "travel",
  "work",
  "vocabulary",
] as const;
export const CHINESE_SCRIPTS = [
  "match-cards",
  "simplified",
  "traditional",
] as const;
export const FORMALITY_LEVELS = ["casual", "neutral", "formal"] as const;
export const PLAYBACK_SPEEDS = ["0.75", "1", "1.25", "1.5"] as const;

export type ImportLanguage = (typeof IMPORT_LANGUAGES)[number];
export type ThemePreference = (typeof THEMES)[number];
export type ReadingSizePreference = (typeof READING_SIZES)[number];
export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];
export type CorrectionStyle = (typeof CORRECTION_STYLES)[number];
export type ConversationGoal = (typeof CONVERSATION_GOALS)[number];
export type ChineseScriptPreference = (typeof CHINESE_SCRIPTS)[number];
export type FormalityLevel = (typeof FORMALITY_LEVELS)[number];
export type PlaybackSpeedPreference = (typeof PLAYBACK_SPEEDS)[number];

export type UserPreferences = {
  theme: ThemePreference;
  importLanguage: ImportLanguage;
  readingSize: ReadingSizePreference;
  proficiency: ProficiencyLevel;
  correctionStyle: CorrectionStyle;
  conversationGoal: ConversationGoal;
  chineseScript: ChineseScriptPreference;
  formality: FormalityLevel;
  playbackSpeed: PlaybackSpeedPreference;
};

const defaultPreferences: UserPreferences = {
  theme: "dark",
  importLanguage: "zh-CN",
  readingSize: "default",
  proficiency: "intermediate",
  correctionStyle: "gentle",
  conversationGoal: "everyday",
  chineseScript: "match-cards",
  formality: "neutral",
  playbackSpeed: "1",
};

export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences> {
  const [preferences] = await getDb()
    .select({
      theme: userPreferences.theme,
      importLanguage: userPreferences.importLanguage,
      readingSize: userPreferences.readingSize,
      proficiency: userPreferences.proficiency,
      correctionStyle: userPreferences.correctionStyle,
      conversationGoal: userPreferences.conversationGoal,
      chineseScript: userPreferences.chineseScript,
      formality: userPreferences.formality,
      playbackSpeed: userPreferences.playbackSpeed,
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
