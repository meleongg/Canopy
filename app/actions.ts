"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { hasDatabaseEnv } from "@/db/env";
import { getDb } from "@/db/client";
import { flashcards } from "@/db/schema";
import {
  databaseSetupMessage,
  isMissingDatabaseSchemaError,
} from "@/lib/database-errors";
import {
  type ParsedVocabularyEntry,
  buildManualVocabularyEntry,
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

async function upsertVocabularyEntries(
  entries: ParsedVocabularyEntry[],
): Promise<ActionState> {
  const session = await requireAuth();

  if (!hasDatabaseEnv()) {
    return {
      ok: false,
      message: "Database env is missing. Add runtime vars in Vercel to continue.",
    };
  }

  if (entries.length === 0) {
    return { ok: false, message: "Add at least one vocabulary card." };
  }

  try {
    const result = await importVocabularyEntries(session.user.id, entries);
    revalidatePath("/dashboard");
    revalidatePath("/collection");
    revalidatePath("/overstory");
    revalidatePath("/understory/setup");
    const saved = result.importedCount + result.updatedCount;
    return {
      ok: true,
      message:
        saved === 1
          ? "Saved your flashcard."
          : `Saved ${result.importedCount} new and updated ${result.updatedCount} existing cards.`,
    };
  } catch (error) {
    if (isMissingDatabaseSchemaError(error)) {
      return { ok: false, message: databaseSetupMessage() };
    }
    console.error("Vocabulary save failed.", error);
    return {
      ok: false,
      message: "Your vocabulary was not saved. Please try again.",
    };
  }
}

export async function addFlashcardAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const languageCode = "zh-CN";
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

  let entry: ParsedVocabularyEntry | null;
  try {
    entry = await buildManualVocabularyEntry({
      languageCode,
      targetText,
      phoneticReading: phonetic,
      definitions,
    });
  } catch (error) {
    console.error("Manual card parsing failed.", error);
    return {
      ok: false,
      message: "That card could not be read. Check the word and definition.",
    };
  }

  if (!entry) {
    return {
      ok: false,
      message: "Add a word or phrase and at least one plain-text definition.",
    };
  }

  if (exampleContext) {
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

  return upsertVocabularyEntries([entry]);
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
  revalidatePath("/collection");
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
      targetText: flashcards.targetText,
      phoneticReading: flashcards.phoneticReading,
      definitions: flashcards.definitions,
      languageCode: flashcards.languageCode,
      aiExampleContext: flashcards.aiExampleContext,
    })
    .from(flashcards)
    .where(
      and(eq(flashcards.id, cardId), eq(flashcards.userId, session.user.id)),
    )
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
  revalidatePath("/collection");
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
    .where(
      and(eq(flashcards.id, cardId), eq(flashcards.userId, session.user.id)),
    )
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
    .where(
      and(eq(flashcards.id, cardId), eq(flashcards.userId, session.user.id)),
    );

  revalidatePath("/dashboard");
  revalidatePath("/collection");
  revalidatePath("/overstory");
  revalidatePath("/understory/setup");
}
