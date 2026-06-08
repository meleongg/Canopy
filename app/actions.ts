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
import { phoneticTextForSentence } from "@/lib/phonetics";
import { calculateSm2 } from "@/lib/srs";
import {
  MAX_EXAMPLE_CONTEXTS,
  normalizeExampleContexts,
} from "@/lib/example-contexts";

type ActionState = {
  ok: boolean;
  message: string;
};

function id() {
  return crypto.randomUUID();
}

function entriesFromPreviewJson(value: string): ParsedVocabularyEntry[] {
  const parsed = JSON.parse(value) as Partial<ParsedVocabularyEntry>[];

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((entry) => ({
      languageCode: String(entry.languageCode ?? "zh-CN"),
      targetText: String(entry.targetText ?? "").trim(),
      phoneticReading: Array.isArray(entry.phoneticReading)
        ? entry.phoneticReading.map(String).filter(Boolean)
        : String(entry.phoneticReading ?? "")
            .split(/\s+/)
            .filter(Boolean),
      definitions: Array.isArray(entry.definitions)
        ? entry.definitions.map(String).filter(Boolean)
        : String(entry.definitions ?? "")
            .split(/[;/,]|(?:\s{2,})/)
            .map((definition) => definition.trim())
            .filter(Boolean),
      exampleContexts: normalizeExampleContexts(entry.exampleContexts),
      linguisticMeta: entry.linguisticMeta,
    }))
    .filter((entry) => entry.targetText && entry.definitions.length > 0);
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

      if (entry.exampleContexts?.length) {
        await db
          .insert(flashcards)
          .values({
            id: id(),
            userId,
            wordId: word.id,
            aiExampleContext: entry.exampleContexts,
          })
          .onConflictDoUpdate({
            target: [flashcards.userId, flashcards.wordId],
            set: { aiExampleContext: entry.exampleContexts },
          });
      } else {
        await db
          .insert(flashcards)
          .values({
            id: id(),
            userId,
            wordId: word.id,
          })
          .onConflictDoNothing();
      }
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

export async function createFlashcardsFromPreviewAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const previewEntries = String(formData.get("previewEntries") ?? "");
  if (!previewEntries) {
    return { ok: false, message: "Preview at least one vocabulary row first." };
  }

  try {
    return upsertVocabularyEntries(entriesFromPreviewJson(previewEntries));
  } catch {
    return { ok: false, message: "Preview data could not be imported." };
  }
}

export async function addFlashcardAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const languageCode = String(formData.get("manualLanguageCode") ?? "zh-CN");
  const targetText = String(formData.get("targetText") ?? "").trim();
  const phonetic = String(formData.get("phoneticReading") ?? "").trim();
  const definitions = String(formData.get("definitions") ?? "").trim();
  const exampleContext = String(formData.get("exampleContext") ?? "").trim();

  if (!targetText || !definitions) {
    return {
      ok: false,
      message: "Add a target word and at least one definition.",
    };
  }

  const row = [targetText, phonetic, definitions].filter(Boolean).join("\t");
  const entries = await parseVocabularyLog(row, languageCode);
  const [entry] = entries;

  if (entry && exampleContext) {
    entry.exampleContexts = [
      {
        sentence: exampleContext,
        phonetic: phoneticTextForSentence(
          languageCode,
          exampleContext,
          entry.phoneticReading,
        ),
        translation: entry.definitions.join("; "),
        generatedAt: new Date().toISOString(),
      },
    ];
  }

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
      aiExampleContext: flashcards.aiExampleContext,
    })
    .from(flashcards)
    .innerJoin(words, eq(flashcards.wordId, words.id))
    .where(eq(flashcards.id, cardId))
    .limit(1);

  if (!card) {
    return;
  }

  const aiExampleContext = await generateExampleContext(card);
  const existingContexts = normalizeExampleContexts(card.aiExampleContext);
  if (existingContexts.length >= MAX_EXAMPLE_CONTEXTS) {
    return;
  }

  await db
    .update(flashcards)
    .set({
      aiExampleContext: [...existingContexts, aiExampleContext].slice(
        0,
        MAX_EXAMPLE_CONTEXTS,
      ),
    })
    .where(eq(flashcards.id, card.cardId));

  revalidatePath("/");
}

export async function removeContextAction(formData: FormData) {
  if (!hasDatabaseEnv()) {
    return;
  }

  const cardId = String(formData.get("cardId") ?? "");
  const contextIndex = Number(formData.get("contextIndex") ?? -1);
  if (!cardId || contextIndex < 0) {
    return;
  }

  const db = getDb();
  const [card] = await db
    .select({
      aiExampleContext: flashcards.aiExampleContext,
    })
    .from(flashcards)
    .where(eq(flashcards.id, cardId))
    .limit(1);

  if (!card) {
    return;
  }

  const contexts = normalizeExampleContexts(card.aiExampleContext).filter(
    (_context, index) => index !== contextIndex,
  );

  await db
    .update(flashcards)
    .set({ aiExampleContext: contexts })
    .where(eq(flashcards.id, cardId));

  revalidatePath("/");
}
