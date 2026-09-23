import {
  searchActiveDictionary,
  type DictionarySearchResult,
  type DictionarySearchScope,
} from "@/lib/dictionary";
import {
  countHanCharacters,
  headwordLengthMessage,
  type AutofillMatch,
  type AutofillResult,
} from "@/lib/card-draft";
import { compactPinyinKey } from "@/lib/phonetics";

export {
  MAX_HEADWORD_HAN_CHARS,
  countHanCharacters,
  draftFieldsFromDictionaryEntry,
  headwordLengthMessage,
  type AutofillMatch,
  type AutofillResult,
  type CardDraftFields,
} from "@/lib/card-draft";

function inferSearchScope(query: string): DictionarySearchScope {
  if (/\p{Script=Han}/u.test(query)) return "chinese";
  // Latin queries may be English glosses or toneless/toned pinyin (`jichang`,
  // `ji chang`, `ji1chang3`). Search all so both surfaces can match.
  return "all";
}

function rankMatchKind(
  query: string,
  entry: DictionarySearchResult,
): AutofillMatch["matchKind"] {
  if (entry.simplified === query || entry.traditional === query) {
    return "exact";
  }
  const compactQuery = compactPinyinKey(query);
  const compactEntry = compactPinyinKey(entry.pinyin);
  if (compactQuery && compactEntry === compactQuery) {
    return "exact";
  }
  if (
    /\p{Script=Han}/u.test(query) &&
    query.length > entry.simplified.length &&
    (query.includes(entry.simplified) || query.includes(entry.traditional))
  ) {
    return "component";
  }
  return "partial";
}

export async function matchDictionaryForCardAutofill(
  userId: string,
  rawQuery: string,
): Promise<AutofillResult> {
  const query = rawQuery.trim();
  if (!query) {
    return {
      query,
      matches: [],
      exactMatch: false,
      suggestSplit: false,
      helpMessage: null,
    };
  }

  const lengthHelp = headwordLengthMessage(query);
  if (lengthHelp && /\p{Script=Han}/u.test(query)) {
    return {
      query,
      matches: [],
      exactMatch: false,
      suggestSplit: true,
      helpMessage: `${lengthHelp} Split into a shorter headword for better dictionary matches.`,
    };
  }

  const scope = inferSearchScope(query);
  const entries = await searchActiveDictionary(userId, query, scope);
  const matches: AutofillMatch[] = entries.map((entry) => ({
    entryId: entry.entryId,
    traditional: entry.traditional,
    simplified: entry.simplified,
    pinyin: entry.pinyin,
    definitions: entry.definitions,
    matchKind: rankMatchKind(query, entry),
  }));

  const exactMatch = matches.some((match) => match.matchKind === "exact");
  const hanPhrase =
    /\p{Script=Han}/u.test(query) && countHanCharacters(query) >= 2;
  const suggestSplit = hanPhrase && !exactMatch;
  const helpMessage = suggestSplit
    ? "No exact dictionary match for the whole phrase. Save as-is, or choose a shorter match below for better pinyin and definitions."
    : matches.length === 0
      ? "No CC-CEDICT matches yet. You can still fill the card manually and save."
      : null;

  matches.sort((left, right) => {
    const order = { exact: 0, component: 1, partial: 2 } as const;
    return order[left.matchKind] - order[right.matchKind];
  });

  return {
    query,
    matches: matches.slice(0, 8),
    exactMatch,
    suggestSplit,
    helpMessage,
  };
}
