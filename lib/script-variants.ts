import { and, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dictionaryEntries, dictionaryReleases } from "@/db/schema";
import type { ParsedVocabularyEntry } from "@/lib/ingestion";
import type { ChineseScriptPreference } from "@/lib/user-preferences";

type VariantCard = {
  languageCode: string;
  targetText: string;
  simplifiedText?: string | null;
  traditionalText?: string | null;
};

export function displayCardText(
  card: VariantCard,
  script: ChineseScriptPreference,
) {
  if (!card.languageCode.startsWith("zh")) return card.targetText;
  if (script === "simplified") return card.simplifiedText ?? card.targetText;
  if (script === "traditional") return card.traditionalText ?? card.targetText;
  return card.targetText;
}

export async function enrichScriptVariants(
  entries: ParsedVocabularyEntry[],
) {
  const candidateTexts = [...new Set(
    entries
      .filter((entry) => entry.languageCode.startsWith("zh"))
      .filter((entry) => !entry.simplifiedText && !entry.traditionalText)
      .map((entry) => entry.targetText),
  )];
  if (!candidateTexts.length) return entries;

  const matches = await getDb()
    .select({
      id: dictionaryEntries.id,
      simplified: dictionaryEntries.simplified,
      traditional: dictionaryEntries.traditional,
    })
    .from(dictionaryEntries)
    .innerJoin(
      dictionaryReleases,
      eq(dictionaryEntries.releaseId, dictionaryReleases.id),
    )
    .where(
      and(
        eq(dictionaryReleases.isActive, true),
        or(
          inArray(dictionaryEntries.simplified, candidateTexts),
          inArray(dictionaryEntries.traditional, candidateTexts),
        ),
      ),
    );
  const matchesByText = new Map<string, typeof matches>();
  for (const match of matches) {
    for (const text of [match.simplified, match.traditional]) {
      if (candidateTexts.includes(text)) {
        matchesByText.set(text, [...(matchesByText.get(text) ?? []), match]);
      }
    }
  }

  return entries.map((entry) => {
    const entryMatches = matchesByText.get(entry.targetText) ?? [];
    if (entryMatches.length !== 1) return entry;
    const match = entryMatches[0];
    if (!match) return entry;
    return {
      ...entry,
      dictionaryEntryId: match.id,
      simplifiedText: match.simplified,
      traditionalText: match.traditional,
    };
  });
}
