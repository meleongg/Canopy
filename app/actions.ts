"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { hasDatabaseEnv } from "@/db/env";
import { getDb } from "@/db/client";
import { flashcards, words } from "@/db/schema";
import { ensureDemoUser } from "@/lib/data";
import {
  databaseSetupMessage,
  isMissingDatabaseSchemaError,
} from "@/lib/database-errors";
import {
  type ParsedVocabularyEntry,
  parseVocabularyLog,
} from "@/lib/ingestion";
import { generateExampleContext } from "@/lib/openai";
import { calculateSm2 } from "@/lib/srs";

type ActionState = {
  ok: boolean;
  message: string;
};

function id() {
  return crypto.randomUUID();
}

async function upsertVocabularyEntries(
  entries: ParsedVocabularyEntry[],
): Promise<ActionState> {
  if (!hasDatabaseEnv()) {
    return {
      ok: false,
      message: "Database env is missing. Add runtime vars in Vercel to import.",
    };
  }

  if (entries.length === 0) {
    return { ok: false, message: "Drop or paste at least one vocabulary row." };
  }

  const db = getDb();
  let userId: string;

  try {
    userId = await ensureDemoUser();
  } catch (error) {
    if (isMissingDatabaseSchemaError(error)) {
      return { ok: false, message: databaseSetupMessage() };
    }

    throw error;
  }

  for (const entry of entries) {
    try {
      const [word] = await db
        .insert(words)
        .values({
          id: id(),
          languageCode: entry.languageCode,
          targetText: entry.targetText,
          phoneticReading: entry.phoneticReading,
          definitions: entry.definitions,
          linguisticMeta: entry.linguisticMeta,
        })
        .onConflictDoUpdate({
          target: [words.languageCode, words.targetText],
          set: {
            phoneticReading: entry.phoneticReading,
            definitions: entry.definitions,
            linguisticMeta: entry.linguisticMeta,
          },
        })
        .returning({ id: words.id });

      await db
        .insert(flashcards)
        .values({
          id: id(),
          userId,
          wordId: word.id,
        })
        .onConflictDoNothing();
    } catch (error) {
      if (isMissingDatabaseSchemaError(error)) {
        return { ok: false, message: databaseSetupMessage() };
      }

      throw error;
    }
  }

  revalidatePath("/");
  return { ok: true, message: `Imported ${entries.length} vocabulary rows.` };
}

export async function importVocabularyAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rawText = String(formData.get("rawText") ?? "");
  const languageCode = String(formData.get("languageCode") ?? "zh-CN");
  const file = formData.get("file");
  const fileText =
    file instanceof File && file.size > 0 ? await file.text() : "";
  const entries = await parseVocabularyLog(fileText || rawText, languageCode);

  return upsertVocabularyEntries(entries);
}

export async function addFlashcardAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const languageCode = String(formData.get("manualLanguageCode") ?? "zh-CN");
  const targetText = String(formData.get("targetText") ?? "").trim();
  const phonetic = String(formData.get("phoneticReading") ?? "").trim();
  const definitions = String(formData.get("definitions") ?? "").trim();

  if (!targetText || !definitions) {
    return {
      ok: false,
      message: "Add a target word and at least one definition.",
    };
  }

  const row = [targetText, phonetic, definitions].filter(Boolean).join("\t");
  const entries = await parseVocabularyLog(row, languageCode);

  return upsertVocabularyEntries(entries);
}

export async function reviewCardAction(formData: FormData) {
  if (!hasDatabaseEnv()) {
    return;
  }

  const cardId = String(formData.get("cardId") ?? "");
  const quality = Number(formData.get("quality") ?? 0);
  const db = getDb();
  const [card] = await db
    .select({
      interval: flashcards.interval,
      repetition: flashcards.repetition,
      easiness: flashcards.easiness,
    })
    .from(flashcards)
    .where(eq(flashcards.id, cardId))
    .limit(1);

  if (!card) {
    return;
  }

  const next = calculateSm2(card, quality);
  await db.update(flashcards).set(next).where(eq(flashcards.id, cardId));

  revalidatePath("/");
}

export async function generateContextAction(formData: FormData) {
  if (!hasDatabaseEnv()) {
    return;
  }

  const cardId = String(formData.get("cardId") ?? "");
  const db = getDb();
  const [card] = await db
    .select({
      cardId: flashcards.id,
      targetText: words.targetText,
      phoneticReading: words.phoneticReading,
      definitions: words.definitions,
      languageCode: words.languageCode,
    })
    .from(flashcards)
    .innerJoin(words, eq(flashcards.wordId, words.id))
    .where(eq(flashcards.id, cardId))
    .limit(1);

  if (!card) {
    return;
  }

  const aiExampleContext = await generateExampleContext(card);
  await db
    .update(flashcards)
    .set({ aiExampleContext })
    .where(eq(flashcards.id, card.cardId));

  revalidatePath("/");
}
