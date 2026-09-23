import {
  dictionaryEntryAsCard,
  searchActiveDictionary,
  type DictionarySearchResult,
  type DictionarySearchScope,
} from "@/lib/dictionary";

export const MAX_HEADWORD_HAN_CHARS = 8;

export type CardDraftFields = {
  targetText: string;
  phoneticReading: string;
  definitions: string;
  dictionaryEntryId?: string;
};

export type AutofillMatch = DictionarySearchResult & {
  matchKind: "exact" | "partial" | "component";
};

export type AutofillResult = {
  query: string;
  matches: AutofillMatch[];
  exactMatch: boolean;
  suggestSplit: boolean;
  helpMessage: string | null;
};

export function countHanCharacters(text: string) {
  return (text.match(/\p{Script=Han}/gu) ?? []).length;
}

export function headwordLengthMessage(text: string) {
  const hanCount = countHanCharacters(text);
  if (hanCount > MAX_HEADWORD_HAN_CHARS) {
    return `Keep the headword to ${MAX_HEADWORD_HAN_CHARS} Chinese characters or fewer (now ${hanCount}).`;
  }
  return null;
}

/** Shared mapping: CC-CEDICT entry → editable Add Card draft fields. */
export function draftFieldsFromDictionaryEntry(
  entry: Pick<
    DictionarySearchResult,
    "entryId" | "simplified" | "traditional" | "pinyin" | "definitions"
  >,
): CardDraftFields {
  const card = dictionaryEntryAsCard(entry);
  return {
    targetText: card.targetText,
    phoneticReading: card.phoneticReading.join(" "),
    definitions: card.definitions.join("; "),
    dictionaryEntryId: card.dictionaryEntryId,
  };
}

function inferSearchScope(query: string): DictionarySearchScope {
  if (/\p{Script=Han}/u.test(query)) return "chinese";
  if (/[1-5āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i.test(query)) return "pinyin";
  return "english";
}

function rankMatchKind(
  query: string,
  entry: DictionarySearchResult,
): AutofillMatch["matchKind"] {
  if (entry.simplified === query || entry.traditional === query) {
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
    ...entry,
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

  // Prefer exact, then component (useful for phrases), then other partials.
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
