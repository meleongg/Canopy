import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  isNotNull,
  or,
  sql,
} from "drizzle-orm";
import { hasDatabaseEnv } from "@/db/env";
import { getDb } from "@/db/client";
import { aiSessions, flashcards, user } from "@/db/schema";
import { DEMO_USER_ID } from "@/lib/constants";
import {
  type ExampleContext,
  normalizeExampleContexts,
} from "@/lib/example-contexts";
import {
  buildLearningRhythm,
  type LearningRhythmDay,
} from "@/lib/learning-rhythm";
import type { PracticeSource } from "@/lib/practice";

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
  createdAt: Date;
  archivedAt: Date | null;
  aiExampleContexts: ExampleContext[];
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

export async function getDashboardData(
  userId: string,
  scope: "active" | "archived" | "all" = "active",
): Promise<DashboardCard[]> {
  if (!hasDatabaseEnv()) {
    return [];
  }

  const db = getDb();

  const scopeCondition =
    scope === "active"
      ? isNull(flashcards.archivedAt)
      : scope === "archived"
        ? isNotNull(flashcards.archivedAt)
        : undefined;

  const rows = await db
    .select({
      id: flashcards.id,
      languageCode: flashcards.languageCode,
      targetText: flashcards.targetText,
      phoneticReading: flashcards.phoneticReading,
      definitions: flashcards.definitions,
      interval: flashcards.interval,
      repetition: flashcards.repetition,
      easiness: flashcards.easiness,
      nextReviewAt: flashcards.nextReviewAt,
      lastReviewedAt: flashcards.lastReviewedAt,
      createdAt: flashcards.createdAt,
      archivedAt: flashcards.archivedAt,
      aiExampleContext: flashcards.aiExampleContext,
    })
    .from(flashcards)
    .where(
      scopeCondition
        ? and(eq(flashcards.userId, userId), scopeCondition)
        : eq(flashcards.userId, userId),
    )
    .orderBy(asc(flashcards.nextReviewAt))
    .limit(60);

  return rows.map(({ aiExampleContext, ...card }) => ({
    ...card,
    aiExampleContexts: normalizeExampleContexts(aiExampleContext),
  }));
}

export type CollectionPage = {
  cards: DashboardCard[];
  total: number;
};

export async function getCollectionPage(
  userId: string,
  options: {
    scope: "active" | "archived";
    query: string;
    page: number;
    pageSize: number;
  },
): Promise<CollectionPage> {
  if (!hasDatabaseEnv()) return { cards: [], total: 0 };

  const db = getDb();
  const query = options.query.trim();
  const scopeCondition =
    options.scope === "archived"
      ? isNotNull(flashcards.archivedAt)
      : isNull(flashcards.archivedAt);
  const searchCondition = query
    ? or(ilike(flashcards.targetText, `%${query}%`))
    : undefined;
  const where = and(
    eq(flashcards.userId, userId),
    scopeCondition,
    searchCondition,
  );
  const offset = Math.max(0, options.page - 1) * options.pageSize;
  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: flashcards.id,
        languageCode: flashcards.languageCode,
        targetText: flashcards.targetText,
        phoneticReading: flashcards.phoneticReading,
        definitions: flashcards.definitions,
        interval: flashcards.interval,
        repetition: flashcards.repetition,
        easiness: flashcards.easiness,
        nextReviewAt: flashcards.nextReviewAt,
        lastReviewedAt: flashcards.lastReviewedAt,
        createdAt: flashcards.createdAt,
        archivedAt: flashcards.archivedAt,
        aiExampleContext: flashcards.aiExampleContext,
      })
      .from(flashcards)
      .where(where)
      .orderBy(asc(flashcards.nextReviewAt))
      .limit(options.pageSize)
      .offset(offset),
    db.select({ total: count() }).from(flashcards).where(where),
  ]);

  return {
    cards: rows.map(({ aiExampleContext, ...card }) => ({
      ...card,
      aiExampleContexts: normalizeExampleContexts(aiExampleContext),
    })),
    total: totalRow?.total ?? 0,
  };
}

export async function getPracticeCards(
  userId: string,
  count: number,
  source: PracticeSource,
): Promise<DashboardCard[]> {
  if (!hasDatabaseEnv() || count <= 0) return [];

  const db = getDb();
  const rows = await db
    .select({
      id: flashcards.id,
      languageCode: flashcards.languageCode,
      targetText: flashcards.targetText,
      phoneticReading: flashcards.phoneticReading,
      definitions: flashcards.definitions,
      interval: flashcards.interval,
      repetition: flashcards.repetition,
      easiness: flashcards.easiness,
      nextReviewAt: flashcards.nextReviewAt,
      lastReviewedAt: flashcards.lastReviewedAt,
      createdAt: flashcards.createdAt,
      archivedAt: flashcards.archivedAt,
      aiExampleContext: flashcards.aiExampleContext,
    })
    .from(flashcards)
    .where(and(eq(flashcards.userId, userId), isNull(flashcards.archivedAt)))
    .orderBy(
      source === "random"
        ? sql`random()`
        : source === "recent"
          ? desc(flashcards.createdAt)
          : asc(flashcards.createdAt),
    )
    .limit(count);

  return rows.map(({ aiExampleContext, ...card }) => ({
    ...card,
    aiExampleContexts: normalizeExampleContexts(aiExampleContext),
  }));
}

export async function getDashboardLearningRhythm(
  userId: string,
): Promise<LearningRhythmDay[]> {
  if (!hasDatabaseEnv()) {
    return buildLearningRhythm([], []);
  }

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 6);
  const db = getDb();
  const [reviews, practices] = await Promise.all([
    db
      .select({ reviewedAt: flashcards.lastReviewedAt })
      .from(flashcards)
      .where(
        and(
          eq(flashcards.userId, userId),
          gte(flashcards.lastReviewedAt, start),
        ),
      ),
    db
      .select({ createdAt: aiSessions.createdAt })
      .from(aiSessions)
      .where(
        and(eq(aiSessions.userId, userId), gte(aiSessions.createdAt, start)),
      ),
  ]);

  return buildLearningRhythm(
    reviews.flatMap((review) => (review.reviewedAt ? [review.reviewedAt] : [])),
    practices.map((practice) => practice.createdAt),
  );
}
