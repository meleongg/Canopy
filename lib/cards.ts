import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb, getSql } from "@/db/client";
import { flashcards, words } from "@/db/schema";
import type { ParsedVocabularyEntry } from "@/lib/ingestion";
import { calculateSm2 } from "@/lib/srs";

export type CardSeed = {
  id: string;
  languageCode: string;
  targetText: string;
  phoneticReading: string[];
  definitions: string[];
};

export type ImportResult = {
  importedCount: number;
  updatedCount: number;
};

export type CardPatch = {
  archived?: boolean;
  targetText?: string;
  phoneticReading?: string[];
  definitions?: string[];
};

function id() {
  return crypto.randomUUID();
}

export async function importVocabularyEntries(
  userId: string,
  entries: ParsedVocabularyEntry[],
): Promise<ImportResult> {
  if (entries.length === 0) {
    return { importedCount: 0, updatedCount: 0 };
  }

  const results = await getSql().transaction<false, false>((sql) =>
    entries.map((entry) => {
      const exampleContexts = entry.exampleContexts?.length
        ? JSON.stringify(entry.exampleContexts)
        : null;
      const linguisticMeta = entry.linguisticMeta
        ? JSON.stringify(entry.linguisticMeta)
        : null;

      return sql`
        with upserted_word as (
          insert into words (
            id, language_code, target_text, phonetic_reading, definitions, linguistic_meta
          ) values (
            ${id()},
            ${entry.languageCode},
            ${entry.targetText},
            ${JSON.stringify(entry.phoneticReading)}::jsonb,
            ${JSON.stringify(entry.definitions)}::jsonb,
            ${linguisticMeta}::jsonb
          )
          on conflict (language_code, target_text) do update set
            phonetic_reading = excluded.phonetic_reading,
            definitions = excluded.definitions,
            linguistic_meta = excluded.linguistic_meta
          returning id
        ), upserted_card as (
          insert into flashcards (id, user_id, word_id, ai_example_context)
          select ${id()}, ${userId}, id, ${exampleContexts}::jsonb
          from upserted_word
          on conflict (user_id, word_id) do update set
            ai_example_context = case
              when ${exampleContexts !== null}
                then excluded.ai_example_context
              else flashcards.ai_example_context
            end
          returning xmax = 0 as inserted
        )
        select inserted from upserted_card
      `;
    }),
  );

  const importedCount = results.filter(
    ([row]) => row?.inserted === true,
  ).length;
  const updatedCount = results.length - importedCount;

  return { importedCount, updatedCount };
}

export async function reviewCard(
  userId: string,
  cardId: string,
  rating: 2 | 3 | 4 | 5,
) {
  const db = getDb();
  const [card] = await db
    .select({
      interval: flashcards.interval,
      repetition: flashcards.repetition,
      easiness: flashcards.easiness,
    })
    .from(flashcards)
    .where(
      and(
        eq(flashcards.id, cardId),
        eq(flashcards.userId, userId),
        isNull(flashcards.archivedAt),
      ),
    )
    .limit(1);

  if (!card) {
    return null;
  }

  const next = calculateSm2(card, rating);
  await db
    .update(flashcards)
    .set(next)
    .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, userId)));
  return next;
}

export async function getCardSeeds(userId: string, cardIds: string[]) {
  if (cardIds.length === 0) {
    return [];
  }

  const db = getDb();
  const rows = await db
    .select({
      id: flashcards.id,
      languageCode: words.languageCode,
      targetText: words.targetText,
      phoneticReading: words.phoneticReading,
      definitions: words.definitions,
      targetTextOverride: flashcards.targetTextOverride,
      phoneticReadingOverride: flashcards.phoneticReadingOverride,
      definitionsOverride: flashcards.definitionsOverride,
    })
    .from(flashcards)
    .innerJoin(words, eq(flashcards.wordId, words.id))
    .where(
      and(
        eq(flashcards.userId, userId),
        inArray(flashcards.id, cardIds),
        isNull(flashcards.archivedAt),
      ),
    );

  const seedsById = new Map(
    rows.map(
      ({
        targetTextOverride,
        phoneticReadingOverride,
        definitionsOverride,
        ...row
      }) => [
        row.id,
        {
          ...row,
          targetText: targetTextOverride ?? row.targetText,
          phoneticReading: phoneticReadingOverride ?? row.phoneticReading,
          definitions: definitionsOverride ?? row.definitions,
        },
      ],
    ),
  );
  return cardIds.flatMap((cardId) => {
    const seed = seedsById.get(cardId);
    return seed ? [seed] : [];
  });
}

export async function patchCard(
  userId: string,
  cardId: string,
  patch: CardPatch,
) {
  const db = getDb();
  const values: {
    archivedAt?: Date | null;
    targetTextOverride?: string | null;
    phoneticReadingOverride?: string[] | null;
    definitionsOverride?: string[] | null;
  } = {};

  if (patch.archived !== undefined) {
    values.archivedAt = patch.archived ? new Date() : null;
  }
  if (patch.targetText !== undefined) {
    values.targetTextOverride = patch.targetText || null;
  }
  if (patch.phoneticReading !== undefined) {
    values.phoneticReadingOverride =
      patch.phoneticReading.length > 0 ? patch.phoneticReading : null;
  }
  if (patch.definitions !== undefined) {
    values.definitionsOverride =
      patch.definitions.length > 0 ? patch.definitions : null;
  }

  const [card] = await db
    .update(flashcards)
    .set(values)
    .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, userId)))
    .returning({ id: flashcards.id });

  return card ?? null;
}

export async function deleteCard(userId: string, cardId: string) {
  const db = getDb();
  const [card] = await db
    .delete(flashcards)
    .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, userId)))
    .returning({ id: flashcards.id });

  return card ?? null;
}
