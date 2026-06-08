import { and, asc, eq, lte, or, sql } from "drizzle-orm";
import { hasDatabaseEnv } from "@/db/env";
import { getDb } from "@/db/client";
import { flashcards, user, words } from "@/db/schema";
import { DEMO_USER_ID } from "@/lib/constants";

export type DashboardCard = {
  id: string;
  languageCode: string;
  targetText: string;
  phoneticReading: string[];
  definitions: string[];
  interval: number;
  repetition: number;
  easiness: number;
  nextReviewAt: Date;
  lastReviewedAt: Date | null;
  aiExampleContext: {
    sentence: string;
    phonetic: string;
    translation: string;
    generatedAt: string;
  } | null;
};

export async function ensureDemoUser() {
  if (!hasDatabaseEnv()) {
    return DEMO_USER_ID;
  }

  const db = getDb();
  await db
    .insert(user)
    .values({
      id: DEMO_USER_ID,
      name: "Canopy Local",
      email: "local@canopy.app",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  return DEMO_USER_ID;
}

export async function getDashboardData(): Promise<DashboardCard[]> {
  if (!hasDatabaseEnv()) {
    return [];
  }

  const db = getDb();
  await ensureDemoUser();

  return db
    .select({
      id: flashcards.id,
      languageCode: words.languageCode,
      targetText: words.targetText,
      phoneticReading: words.phoneticReading,
      definitions: words.definitions,
      interval: flashcards.interval,
      repetition: flashcards.repetition,
      easiness: flashcards.easiness,
      nextReviewAt: flashcards.nextReviewAt,
      lastReviewedAt: flashcards.lastReviewedAt,
      aiExampleContext: flashcards.aiExampleContext,
    })
    .from(flashcards)
    .innerJoin(words, eq(flashcards.wordId, words.id))
    .where(eq(flashcards.userId, DEMO_USER_ID))
    .orderBy(asc(flashcards.nextReviewAt))
    .limit(60);
}

export async function getRecommendedSeedCards() {
  if (!hasDatabaseEnv()) {
    return [];
  }

  const db = getDb();
  return db
    .select({
      id: flashcards.id,
      languageCode: words.languageCode,
      targetText: words.targetText,
      phoneticReading: words.phoneticReading,
      definitions: words.definitions,
      interval: flashcards.interval,
      repetition: flashcards.repetition,
      easiness: flashcards.easiness,
      nextReviewAt: flashcards.nextReviewAt,
      lastReviewedAt: flashcards.lastReviewedAt,
      aiExampleContext: flashcards.aiExampleContext,
    })
    .from(flashcards)
    .innerJoin(words, eq(flashcards.wordId, words.id))
    .where(
      and(
        eq(flashcards.userId, DEMO_USER_ID),
        or(
          lte(flashcards.easiness, 240),
          lte(flashcards.nextReviewAt, sql`now()`),
        ),
      ),
    )
    .orderBy(asc(flashcards.nextReviewAt))
    .limit(7);
}
