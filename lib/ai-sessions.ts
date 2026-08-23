import { and, desc, eq, lt, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { aiSessions } from "@/db/schema";
import type { CardSeed } from "@/lib/cards";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiSessionFilter = "all" | "story_sandbox" | "helper_chat";

const AI_SESSION_PAGE_SIZE = 12;

type AiSessionCursor = { createdAt: Date; id: string };

export function encodeAiSessionCursor(cursor: AiSessionCursor) {
  return `${cursor.createdAt.toISOString()}|${cursor.id}`;
}

export function decodeAiSessionCursor(value: string) {
  const separator = value.indexOf("|");
  if (separator < 1 || separator === value.length - 1) return null;
  const createdAt = new Date(value.slice(0, separator));
  const id = value.slice(separator + 1);
  if (Number.isNaN(createdAt.getTime())) return null;
  return { createdAt, id };
}

function snapshot(seeds: CardSeed[]) {
  return seeds.map((seed) => ({ ...seed, cardId: seed.id }));
}

export async function saveStorySession(
  userId: string,
  seeds: CardSeed[],
  story: string,
) {
  await getDb()
    .insert(aiSessions)
    .values({
      id: crypto.randomUUID(),
      userId,
      sessionType: "story_sandbox",
      languageCode: seeds[0]?.languageCode ?? "und",
      seedWordIds: seeds.map((seed) => seed.id),
      seedSnapshot: snapshot(seeds),
      contentHistory: { storyParagraph: story },
    });
}

export async function saveChatSession(
  userId: string,
  seeds: CardSeed[],
  messages: ChatMessage[],
) {
  await getDb()
    .insert(aiSessions)
    .values({
      id: crypto.randomUUID(),
      userId,
      sessionType: "helper_chat",
      languageCode: seeds[0]?.languageCode ?? "und",
      seedWordIds: seeds.map((seed) => seed.id),
      seedSnapshot: snapshot(seeds),
      contentHistory: {
        messages: messages.map((message) => ({
          ...message,
          timestamp: new Date().toISOString(),
        })),
      },
    });
}

export async function listAiSessions(
  userId: string,
  options: { cursor: AiSessionCursor | null; filter: AiSessionFilter },
) {
  const typeCondition =
    options.filter === "all"
      ? undefined
      : eq(aiSessions.sessionType, options.filter);
  const cursorCondition = options.cursor
    ? or(
        lt(aiSessions.createdAt, options.cursor.createdAt),
        and(
          eq(aiSessions.createdAt, options.cursor.createdAt),
          lt(aiSessions.id, options.cursor.id),
        ),
      )
    : undefined;
  const rows = await getDb()
    .select({
      id: aiSessions.id,
      sessionType: aiSessions.sessionType,
      languageCode: aiSessions.languageCode,
      seedSnapshot: aiSessions.seedSnapshot,
      contentHistory: aiSessions.contentHistory,
      createdAt: aiSessions.createdAt,
    })
    .from(aiSessions)
    .where(and(eq(aiSessions.userId, userId), typeCondition, cursorCondition))
    .orderBy(desc(aiSessions.createdAt), desc(aiSessions.id))
    .limit(AI_SESSION_PAGE_SIZE + 1);
  const sessions = rows.slice(0, AI_SESSION_PAGE_SIZE);
  const lastSession = sessions.at(-1);

  return {
    sessions,
    nextCursor:
      rows.length > AI_SESSION_PAGE_SIZE && lastSession
        ? encodeAiSessionCursor(lastSession)
        : null,
  };
}

export async function deleteAiSession(userId: string, sessionId: string) {
  const [session] = await getDb()
    .delete(aiSessions)
    .where(and(eq(aiSessions.id, sessionId), eq(aiSessions.userId, userId)))
    .returning({ id: aiSessions.id });
  return session ?? null;
}
