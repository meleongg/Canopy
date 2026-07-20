"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { hasDatabaseEnv } from "@/db/env";
import { getDb } from "@/db/client";
import { flashcards, words } from "@/db/schema";
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
import { requireAuth } from "@/lib/session";
import { importVocabularyEntries, reviewCard } from "@/lib/cards";
import {
  MAX_EXAMPLE_CONTEXTS,
  normalizeExampleContexts,
} from "@/lib/example-contexts";

type ActionState = {
  ok: boolean;
  message: string;
};

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
  const session = await requireAuth();

  if (!hasDatabaseEnv()) {
    return {
      ok: false,
      message: "Database env is missing. Add runtime vars in Vercel to import.",
    };
  }

  if (entries.length === 0) {
    return { ok: false, message: "Drop or paste at least one vocabulary row." };
  }

  try {
    const result = await importVocabularyEntries(session.user.id, entries);
    revalidatePath("/dashboard");
    revalidatePath("/overstory");
    revalidatePath("/understory/setup");
    return {
      ok: true,
      message: `Imported ${result.importedCount} new and updated ${result.updatedCount} existing vocabulary rows.`,
    };
  } catch (error) {
    if (isMissingDatabaseSchemaError(error)) {
      return { ok: false, message: databaseSetupMessage() };
    }
    throw error;
  }
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
  const session = await requireAuth();

  if (!hasDatabaseEnv()) {
    return;
  }

  const cardId = String(formData.get("cardId") ?? "");
  const quality = Number(formData.get("quality") ?? 0);
  if (![2, 3, 4, 5].includes(quality)) {
    return;
  }
  await reviewCard(session.user.id, cardId, quality as 2 | 3 | 4 | 5);

  revalidatePath("/dashboard");
  revalidatePath("/overstory");
  revalidatePath("/understory/setup");
}

export async function generateContextAction(formData: FormData) {
  const session = await requireAuth();

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
    .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, session.user.id)))
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

  revalidatePath("/dashboard");
  revalidatePath("/overstory");
  revalidatePath("/understory/setup");
}

export async function removeContextAction(formData: FormData) {
  const session = await requireAuth();

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
    .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, session.user.id)))
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
    .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, session.user.id)));

  revalidatePath("/dashboard");
  revalidatePath("/overstory");
  revalidatePath("/understory/setup");
}
