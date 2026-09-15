import { and, eq, isNull, or } from "drizzle-orm";
import { getDb } from "../db/client.ts";
import { flashcards } from "../db/schema.ts";
import { enrichScriptVariants } from "../lib/script-variants.ts";

const db = getDb();
const cards = await db
  .select({
    id: flashcards.id,
    languageCode: flashcards.languageCode,
    targetText: flashcards.targetText,
    phoneticReading: flashcards.phoneticReading,
    definitions: flashcards.definitions,
  })
  .from(flashcards)
  .where(
    and(
      or(isNull(flashcards.simplifiedText), isNull(flashcards.traditionalText)),
      or(
        eq(flashcards.languageCode, "zh-CN"),
        eq(flashcards.languageCode, "zh-HK"),
      ),
    ),
  );

const enriched = await enrichScriptVariants(cards);
let updated = 0;
for (const [index, card] of cards.entries()) {
  const variant = enriched[index];
  if (!variant?.dictionaryEntryId) continue;
  await db
    .update(flashcards)
    .set({
      dictionaryEntryId: variant.dictionaryEntryId,
      simplifiedText: variant.simplifiedText,
      traditionalText: variant.traditionalText,
    })
    .where(eq(flashcards.id, card.id));
  updated += 1;
}

console.log(`Enriched ${updated} of ${cards.length} eligible Chinese cards.`);
